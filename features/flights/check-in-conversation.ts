import { listOf } from "@/features/chat/lookup";
import {
  BAGGAGE_STEPS,
  EXTRAS_STEPS,
  checkInDraftOf,
  checkInQuestionsOf,
  formatPrice,
  priceLinesOf,
} from "@/features/flights/check-in-questions";
import { findCity, flightsBetween } from "@/features/flights/flight-network";
import { loadCheckIn, searchFlights } from "@/features/flights/flight-requests";
import { errorMessage, localToday } from "@/features/flights/flight-schema";
import type {
  AskUserAnswer,
  AskUserQuestion,
} from "@/components/ui/ask-user-questions";
import type { PriceLine } from "@/features/flights/check-in-questions";
import type { Route } from "@/features/flights/components/route-picker";
import type { NetworkCity } from "@/features/flights/flight-network";
import type {
  BoardingPassData,
  CheckInData,
  FlightOffer,
} from "@/features/flights/flight-schema";

export type Answers = Record<string, AskUserAnswer>;

/**
One thing in the transcript: a message from either side, a boarding pass, or a picker shown in the chat (route, seat map, calendar, search results) waiting for the traveler.
*/
export type ConversationEntry =
  | { id: number; kind: "assistant" | "user"; text: string }
  | { id: number; kind: "pass"; data: BoardingPassData }
  | {
      id: number;
      kind: "seats";
      data: CheckInData;
      defaultSeat?: string;
      resolve: (seat: string) => void;
    }
  | {
      id: number;
      kind: "route";
      resolve: (route: Route) => void;
    }
  | {
      id: number;
      kind: "date";
      defaultDate?: string;
      resolve: (date: string) => void;
    }
  | {
      id: number;
      kind: "flights";
      offers: FlightOffer[];
      resolve: (flight: string) => void;
    };

/**
The questions waiting for the traveler. Answer them with `resolve`.
*/
export interface ConversationPrompt {
  id: number;
  questions: AskUserQuestion[];
  defaultAnswers?: Answers;
  resolve: (answers: Answers) => void;
}

/**
Where the conversation shows up: the component's state setters.
*/
export interface ConversationView {
  add: (entry: ConversationEntry) => void;
  /**
  Empties the transcript, to start over.
  */
  clear: () => void;
  prompt: (prompt: ConversationPrompt) => void;
  think: (isThinking: boolean) => void;
}

/**
What the script can do: write a message, ask questions or show a picker and wait for the answer, show a pass, and think while something loads.
*/
interface Agent {
  say: (text: string) => Promise<void>;
  ask: (questions: AskUserQuestion[], defaults?: Answers) => Promise<Answers>;
  reply: (text: string) => void;
  show: (data: BoardingPassData) => void;
  /**
  Shows the seat map in the chat and waits for the confirmed seat.
  */
  pickSeat: (data: CheckInData, defaultSeat?: string) => Promise<string>;
  /**
  Shows the route card in the chat and waits for the picked cities.
  */
  pickRoute: () => Promise<Route>;
  /**
  Shows the calendar in the chat and waits for the picked date.
  */
  pickDate: (defaultDate?: string) => Promise<string>;
  /**
  Shows the search results in the chat and waits for the picked flight number.
  */
  pickFlight: (offers: FlightOffer[]) => Promise<string>;
  think: <T>(work: Promise<T>) => Promise<T>;
}

type Task = "book" | "check-in" | "seat" | "pass";

interface Booking {
  reference: string;
  lastName: string;
  data: CheckInData;
}

/**
What goes on the pass after a task: the passenger's full name, the seat and the extras.
*/
interface PassDetails {
  passenger: string;
  seat: string;
  perks: string[];
}

/**
How long the assistant "types" before each message, and the least time it thinks while something loads.
*/
const TYPING_MS = 700;
const WHITESPACE = /\s+/gu;
const NAME_PART = /^\p{L}[\p{L}'’.-]*$/u;
const REFERENCE = /^[A-Z\d]{6}$/u;
const MIN_LAST_NAME = 2;
const DAY_FORMAT = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
  weekday: "short",
});
const HASH_BASE = 31;
const MAX_DAYS_AHEAD = 10;
const REFERENCE_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const REFERENCE_LENGTH = 6;

/**
Real flights the demo bookings are on (adsbdb knows their routes).
*/
const DEMO_FLIGHTS = [
  "BA 117",
  "UA 837",
  "LH 400",
  "SQ 25",
  "KL 641",
  "AA 100",
  "SK 903",
] as const;

/**
Thrown into a run that was restarted, so it stops where it is.
*/
class ConversationCancelledError extends Error {
  constructor() {
    super("The conversation was restarted.");
    this.name = "ConversationCancelledError";
  }
}

function typing(signal: AbortSignal) {
  // eslint-disable-next-line promise/avoid-new -- a timer that the abort signal can cut short
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, TYPING_MS);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new ConversationCancelledError());
    });
  });
}

function cleanName(value: string) {
  return value.trim().replaceAll(WHITESPACE, " ");
}

function cleanReference(value: string) {
  return value.replaceAll(WHITESPACE, "").toUpperCase();
}

function validateReference(value: string) {
  return REFERENCE.test(cleanReference(value))
    ? null
    : "References are 6 letters and numbers, like K7QD2M.";
}

/**
Letters only (hyphens and apostrophes too, like O'Neil or Smith-Jones), as on the passport.
*/
function validateName(value: string, required: string, minLength = 1) {
  const name = cleanName(value);
  if (name.length < minLength) {
    return required;
  }
  return name.split(" ").every((part) => NAME_PART.test(part))
    ? null
    : "Use letters only, as on the passport.";
}

function dayAfter(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return localToday(date);
}

/**
"2026-11-03" reads "Tue, Nov 3".
*/
function dayName(date: string) {
  return DAY_FORMAT.format(new Date(`${date}T00:00:00Z`));
}

/**
The demo booking behind a reference: a stable flight and a day in the next 10, so any 6-character reference like K7QD2M finds one. Replace this with a request to your booking system that also checks the last name.
*/
function demoBookingOf(reference: string) {
  let hash = 0;
  for (const char of reference) {
    hash = (hash * HASH_BASE + (char.codePointAt(0) ?? 0)) % 2_147_483_647;
  }
  return {
    date: dayAfter(1 + (hash % MAX_DAYS_AHEAD)),
    flight: DEMO_FLIGHTS[hash % DEMO_FLIGHTS.length],
  };
}

/**
A new 6-character booking reference like K7QD2M. Replace it with the one your booking system gives the new booking.
*/
function newReference() {
  const draws = crypto.getRandomValues(new Uint32Array(REFERENCE_LENGTH));
  const letters = Array.from(
    draws,
    (draw) => REFERENCE_LETTERS[draw % REFERENCE_LETTERS.length]
  );
  return letters.join("");
}

const TASK_QUESTION: AskUserQuestion = {
  id: "task",
  options: [
    {
      description: "Search by city and date",
      id: "book",
      title: "Book a flight",
    },
    {
      description: "Bags, seat and extras",
      id: "check-in",
      title: "Check in for my flight",
    },
    { id: "seat", title: "Change my seat" },
    { id: "pass", title: "Get my boarding pass" },
  ],
  skippable: false,
  title: "What do you need?",
};

const FIND_QUESTIONS: AskUserQuestion[] = [
  {
    freeText: true,
    freeTextMultiline: false,
    freeTextPlaceholder: "K7QD2M",
    freeTextValidate: validateReference,
    id: "reference",
    skippable: false,
    title: "Booking reference",
  },
  {
    freeText: true,
    freeTextMultiline: false,
    freeTextPlaceholder: "Doe",
    freeTextValidate: (value) =>
      validateName(value, "Enter the passenger last name.", MIN_LAST_NAME),
    id: "lastName",
    skippable: false,
    title: "Passenger last name",
  },
];

const FIRST_NAME_QUESTION: AskUserQuestion = {
  freeText: true,
  freeTextMultiline: false,
  freeTextPlaceholder: "Jon",
  freeTextValidate: (value) =>
    validateName(value, "Enter the passenger first name."),
  id: "firstName",
  skippable: false,
  title: "Passenger first name, as on the passport",
};

const LAST_NAME_QUESTION: AskUserQuestion = {
  freeText: true,
  freeTextMultiline: false,
  freeTextPlaceholder: "Doe",
  freeTextValidate: (value) =>
    validateName(value, "Enter the passenger last name.", MIN_LAST_NAME),
  id: "lastName",
  skippable: false,
  title: "Passenger last name, as on the passport",
};

const CHANGE = "change";

function confirmQuestion(total: number): AskUserQuestion {
  return {
    id: "confirm",
    options: [
      {
        id: "confirm",
        title: total > 0 ? `Confirm and pay ${formatPrice(total)}` : "Confirm",
      },
      { id: CHANGE, title: "Change my choices" },
    ],
    skippable: false,
    title: "Review and confirm",
  };
}

const AGAIN_QUESTION: AskUserQuestion = {
  id: "again",
  options: [
    { id: "again", title: "Start over" },
    { id: "done", title: "No, that's all" },
  ],
  skippable: false,
  title: "Anything else I can help with?",
};

function textOf(answers: Answers, id: string) {
  return answers[id]?.otherText ?? "";
}

function choiceOf(answers: Answers, id: string) {
  return answers[id]?.selectedIds[0] ?? "";
}

function titleOf(question: AskUserQuestion, id: string) {
  return question.options?.find((option) => option.id === id)?.title ?? id;
}

function capitalized(text: string) {
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
}

/**
The review as a message: a line per paid pick (the fare first, when booking) and the total, or that there's nothing to pay.
*/
function reviewText(lines: readonly PriceLine[], title: string) {
  if (lines.length === 0) {
    return `${title}. There's nothing to pay.`;
  }
  const total = lines.reduce((sum, line) => sum + line.price, 0);
  const rows = lines.map((line) => `${line.label}: ${formatPrice(line.price)}`);
  return `${title}:\n${rows.join("\n")}\nTotal: ${formatPrice(total)}`;
}

function createAgent(view: ConversationView, signal: AbortSignal): Agent {
  let lastId = 0;
  const nextId = () => {
    lastId += 1;
    return lastId;
  };
  /**
  A promise the traveler settles from a picker or question, rejected when the run is aborted.
  */
  const waitFor = <T>() => {
    const resolvers = Promise.withResolvers<T>();
    signal.addEventListener("abort", () =>
      resolvers.reject(new ConversationCancelledError())
    );
    return resolvers;
  };
  const think = async <T>(work: Promise<T>) => {
    view.think(true);
    try {
      const [result] = await Promise.all([work, typing(signal)]);
      return result;
    } finally {
      view.think(false);
    }
  };
  return {
    ask: (questions, defaultAnswers) => {
      const { promise, resolve } = waitFor<Answers>();
      view.prompt({ defaultAnswers, id: nextId(), questions, resolve });
      return promise;
    },
    pickDate: (defaultDate) => {
      const { promise, resolve } = waitFor<string>();
      view.add({ defaultDate, id: nextId(), kind: "date", resolve });
      return promise;
    },
    pickFlight: (offers) => {
      const { promise, resolve } = waitFor<string>();
      view.add({ id: nextId(), kind: "flights", offers, resolve });
      return promise;
    },
    pickRoute: () => {
      const { promise, resolve } = waitFor<Route>();
      view.add({ id: nextId(), kind: "route", resolve });
      return promise;
    },
    pickSeat: (data, defaultSeat) => {
      const { promise, resolve } = waitFor<string>();
      view.add({ data, defaultSeat, id: nextId(), kind: "seats", resolve });
      return promise;
    },
    reply: (text) => view.add({ id: nextId(), kind: "user", text }),
    async say(text) {
      await think(Promise.resolve());
      view.add({ id: nextId(), kind: "assistant", text });
    },
    show: (data) => view.add({ data, id: nextId(), kind: "pass" }),
    think,
  };
}

/**
A lookup's result, or what went wrong as a sentence the assistant can say. A restart still stops the run.
*/
async function attempt<T>(
  agent: Agent,
  work: Promise<T>,
  fallback: string
): Promise<T | string> {
  try {
    return await agent.think(work);
  } catch (error) {
    if (error instanceof ConversationCancelledError) {
      throw error;
    }
    return errorMessage(error, fallback);
  }
}

/**
Baggage and the cabin bag, answered as the traveler's reply, e.g. "1 bag, cabin bag".
*/
async function askBaggage(agent: Agent, data: CheckInData, previous?: Answers) {
  const answers = await agent.ask(checkInQuestionsOf(BAGGAGE_STEPS), previous);
  const { bags, cabinBag } = checkInDraftOf(data, answers, data.pass.seat);
  agent.reply(
    capitalized(`${bags.title}, ${cabinBag ? "cabin bag" : "no cabin bag"}`)
  );
  return answers;
}

async function askSeat(agent: Agent, data: CheckInData, previous?: string) {
  await agent.say(
    `Pick a seat on the map. You're in ${data.pass.seat} now; seats on the first row have extra legroom.`
  );
  const seat = await agent.pickSeat(data, previous);
  agent.reply(seat === data.pass.seat ? `Keep ${seat}` : `Seat ${seat}`);
  return seat;
}

async function askExtras(agent: Agent, data: CheckInData, previous?: Answers) {
  const answers = await agent.ask(checkInQuestionsOf(EXTRAS_STEPS), previous);
  const { extras } = checkInDraftOf(data, answers, data.pass.seat);
  agent.reply(
    extras.length > 0 ? listOf(extras.map((extra) => extra.title)) : "No extras"
  );
  return answers;
}

/**
Asks for the booking reference and last name until the booking's flight loads, keeping the last name between tries.
*/
async function findBooking(agent: Agent): Promise<Booking> {
  let retry: Answers | undefined;
  for (;;) {
    // eslint-disable-next-line no-await-in-loop -- each try waits for the traveler
    const answers = await agent.ask(FIND_QUESTIONS, retry);
    const reference = cleanReference(textOf(answers, "reference"));
    const lastName = cleanName(textOf(answers, "lastName"));
    agent.reply(`${reference}, ${lastName}`);
    const { flight, date } = demoBookingOf(reference);
    // eslint-disable-next-line no-await-in-loop -- each try waits for the lookup
    const found = await attempt(
      agent,
      loadCheckIn(flight, date),
      "I couldn't look that booking up."
    );
    if (typeof found !== "string") {
      return { data: found, lastName, reference };
    }
    // eslint-disable-next-line no-await-in-loop -- one message at a time
    await agent.say(`${found} Check the reference and try again.`);
    retry = { lastName: answers.lastName } as Answers;
  }
}

/**
The steps (baggage, the seat map, extras, or the seat map alone), then the review: the total, the passenger's name and a confirm. "Change my choices" goes back to the steps with the picks kept.
*/
async function checkIn(
  agent: Agent,
  data: CheckInData,
  {
    isSeatOnly = false,
    fare,
  }: {
    isSeatOnly?: boolean;
    /**
    The fare of a flight being booked: the review's first line, and the last name is asked too.
    */
    fare?: PriceLine;
  } = {}
) {
  const nameQuestions = fare
    ? [FIRST_NAME_QUESTION, LAST_NAME_QUESTION]
    : [FIRST_NAME_QUESTION];
  const title = fare ? "Here's your trip" : "Here's your check-in";
  let bags: Answers | undefined;
  let seat: string | undefined;
  let extras: Answers | undefined;
  let review: Answers | undefined;
  for (;;) {
    if (!isSeatOnly) {
      // eslint-disable-next-line no-await-in-loop -- each round waits for the traveler
      bags = await askBaggage(agent, data, bags);
    }
    // eslint-disable-next-line no-await-in-loop -- each round waits for the traveler
    seat = await askSeat(agent, data, seat);
    if (!isSeatOnly) {
      // eslint-disable-next-line no-await-in-loop -- each round waits for the traveler
      extras = await askExtras(agent, data, extras);
    }
    const draft = checkInDraftOf(data, { ...bags, ...extras }, seat);
    const lines = fare ? [fare, ...priceLinesOf(draft)] : priceLinesOf(draft);
    // eslint-disable-next-line no-await-in-loop -- one message at a time
    await agent.say(reviewText(lines, title));
    const total = lines.reduce((sum, { price }) => sum + price, 0);
    // eslint-disable-next-line no-await-in-loop -- each round waits for the traveler
    review = await agent.ask(
      [...nameQuestions, confirmQuestion(total)],
      review
        ? { firstName: review.firstName, lastName: review.lastName }
        : undefined
    );
    const firstName = cleanName(textOf(review, "firstName"));
    const lastName = cleanName(textOf(review, "lastName"));
    if (choiceOf(review, "confirm") !== CHANGE) {
      const name = [firstName, lastName].filter(Boolean).join(" ");
      agent.reply(`${name}, confirmed`);
      return { draft, firstName, lastName };
    }
    agent.reply("Change my choices");
  }
}

/**
The task after the booking is found, ending with what goes on the pass.
*/
async function finishTask(
  agent: Agent,
  task: Task,
  data: CheckInData,
  lastName: string
): Promise<PassDetails> {
  if (task === "pass") {
    const answers = await agent.ask([FIRST_NAME_QUESTION]);
    const passenger = `${cleanName(textOf(answers, "firstName"))} ${lastName}`;
    agent.reply(passenger);
    await agent.say("Here's your boarding pass.");
    return { passenger, perks: [], seat: data.pass.seat };
  }
  const { draft, firstName } = await checkIn(agent, data, {
    isSeatOnly: task === "seat",
  });
  const { seat } = draft.seat;
  await agent.say(
    task === "seat"
      ? `Done, you're in ${seat} now. Here's your boarding pass.`
      : "You're checked in. Here's your boarding pass."
  );
  return {
    passenger: `${firstName} ${lastName}`,
    perks: draft.extras.map((extra) => extra.title),
    seat,
  };
}

/**
The route, from the route card in the chat.
*/
async function askRoute(agent: Agent) {
  await agent.say("Where are you flying?");
  const route = await agent.pickRoute();
  const from = findCity(route.from);
  const to = findCity(route.to);
  if (!from || !to) {
    throw new Error("The route card let a city through that isn't flown.");
  }
  agent.reply(`${from.city} to ${to.city}`);
  return { from, to };
}

/**
Asks for a date on the calendar until there are flights that day, then for one of them.
*/
async function pickOffer(agent: Agent, from: NetworkCity, to: NetworkCity) {
  const count = flightsBetween(from, to).length;
  const often =
    count === 1 ? "There's 1 flight" : `There are up to ${count} flights`;
  await agent.say(
    `${often} a day from ${from.city} to ${to.city}. When do you want to fly?`
  );
  let date: string | undefined;
  for (;;) {
    // eslint-disable-next-line no-await-in-loop -- each try waits for the traveler
    date = await agent.pickDate(date);
    agent.reply(dayName(date));
    // eslint-disable-next-line no-await-in-loop -- each try waits for the search
    const offers = await attempt(
      agent,
      searchFlights(from.city, to.city, date),
      "The flight search didn't answer."
    );
    if (typeof offers !== "string" && offers.length > 0) {
      const found =
        offers.length === 1 ? "1 flight" : `${offers.length} flights`;
      // eslint-disable-next-line no-await-in-loop -- one message at a time
      await agent.say(
        `${found} on ${dayName(date)}. Fares are one way, per passenger.`
      );
      // eslint-disable-next-line no-await-in-loop -- each try waits for the traveler
      const flight = await agent.pickFlight(offers);
      const offer =
        offers.find((entry) => entry.flight === flight) ?? offers[0];
      agent.reply(`${offer.flight} at ${offer.departureTime}`);
      return offer;
    }
    const why =
      typeof offers === "string"
        ? `${offers} Pick the date again to retry.`
        : "Nothing flies that day. Try another date.";
    // eslint-disable-next-line no-await-in-loop -- one message at a time
    await agent.say(why);
  }
}

/**
Booking: the route, a date and a flight, then the same steps as check-in with the fare on the review and the passenger's full name. Ends with a new booking reference, or null when the flight couldn't be loaded.
*/
async function bookFlight(agent: Agent): Promise<BoardingPassData | null> {
  const { from, to } = await askRoute(agent);
  const offer = await pickOffer(agent, from, to);
  const data = await attempt(
    agent,
    loadCheckIn(offer.flight, offer.date),
    "I couldn't load that flight."
  );
  if (typeof data === "string") {
    await agent.say(`${data} Start over to try another flight.`);
    return null;
  }
  await agent.say(
    `${offer.flight} it is. I'm holding seat ${data.pass.seat} in ${offer.cabin} for you. Let's set up the trip.`
  );
  const { draft, firstName, lastName } = await checkIn(agent, data, {
    fare: { label: `${offer.cabin} fare, ${offer.flight}`, price: offer.price },
  });
  const reference = newReference();
  await agent.say(
    `Booked! Your reference is ${reference}. Here's your boarding pass.`
  );
  return {
    ...data.pass,
    passenger: `${firstName} ${lastName}`,
    perks: draft.extras.map((extra) => extra.title),
    reference,
    seat: draft.seat.seat,
  };
}

/**
A task on a booking the traveler already has: find it, then check in, change the seat or show the pass.
*/
async function manageBooking(agent: Agent, task: Task) {
  await agent.say("Sure. First, let's find your booking.");
  const { data, lastName, reference } = await findBooking(agent);
  const { pass } = data;
  await agent.say(
    `Found ${reference}: ${pass.flight} from ${pass.from.city} to ${pass.to.city} on ${dayName(pass.date)}, ${pass.cabin}, seat ${pass.seat}.`
  );
  return {
    ...pass,
    ...(await finishTask(agent, task, data, lastName)),
    reference,
  };
}

/**
One conversation: what the traveler needs, that task's steps and review, then the boarding pass. Resolves true when the traveler asks to start over.
*/
async function converse(agent: Agent) {
  await agent.say("Hi, I'm your travel assistant. How can I help you today?");
  const task = choiceOf(await agent.ask([TASK_QUESTION]), "task") as Task;
  agent.reply(titleOf(TASK_QUESTION, task));

  const pass =
    task === "book"
      ? await bookFlight(agent)
      : await manageBooking(agent, task);
  if (pass) {
    agent.show(pass);
  }

  const again = choiceOf(await agent.ask([AGAIN_QUESTION]), "again");
  agent.reply(titleOf(AGAIN_QUESTION, again));
  if (again === "again") {
    return true;
  }
  await agent.say("Have a good flight!");
  return false;
}

async function converseUntilDone(view: ConversationView, agent: Agent) {
  let isAgain = true;
  while (isAgain) {
    view.clear();
    // eslint-disable-next-line no-await-in-loop -- one conversation at a time
    isAgain = await converse(agent);
  }
}

/**
Runs the conversation in the view, from the start again each time the traveler asks to start over. Aborting the signal (unmounting) stops it where it is, and the promise then resolves quietly.
*/
export async function runCheckInConversation(
  view: ConversationView,
  signal: AbortSignal
) {
  try {
    await converseUntilDone(view, createAgent(view, signal));
  } catch (error) {
    if (!(error instanceof ConversationCancelledError)) {
      throw error;
    }
  }
}
