import { seatOptionOf } from "@/features/flights/flight-schema";
import type {
  AskUserAnswer,
  AskUserQuestion,
} from "@/components/ui/ask-user-questions";
import type { CheckInData, SeatOption } from "@/features/flights/flight-schema";

/**
One option with a price in US dollars (0 when it's included).
*/
export interface CheckInChoice {
  id: string;
  /**
  e.g. "Lounge access".
  */
  title: string;
  description?: string;
  price: number;
}

/**
The check-in questions, in the order they're asked around the seat map: baggage and cabin bag before it, extras after it.
*/
export type CheckInStep = "baggage" | "cabin-bag" | "extras";

export const BAGGAGE_STEPS: readonly CheckInStep[] = ["baggage", "cabin-bag"];

export const EXTRAS_STEPS: readonly CheckInStep[] = ["extras"];

/**
What the traveler picked.
*/
export interface CheckInDraft {
  bags: CheckInChoice;
  cabinBag: boolean;
  seat: SeatOption;
  /**
  Empty when skipped.
  */
  extras: CheckInChoice[];
}

export interface PriceLine {
  label: string;
  price: number;
}

/**
"$34", as the airline shows prices: US dollars.
*/
export function formatPrice(amount: number) {
  return `$${amount}`;
}

const BAG_PRICE = 34;

const BAGS: readonly CheckInChoice[] = [
  { description: "Travel light", id: "0", price: 0, title: "No bag" },
  {
    description: `50 lb, ${formatPrice(BAG_PRICE)}`,
    id: "1",
    price: BAG_PRICE,
    title: "1 bag",
  },
  {
    description: `50 lb each, ${formatPrice(BAG_PRICE * 2)}`,
    id: "2",
    price: BAG_PRICE * 2,
    title: "2 bags",
  },
];

const CABIN_BAG = "cabin-bag";

const EXTRAS: readonly CheckInChoice[] = [
  {
    description: "Move through security with a dedicated priority lane.",
    id: "fast-track",
    price: 12,
    title: "Fast Track",
  },
  {
    description: "Relax, recharge and enjoy refreshments before departure.",
    id: "lounge",
    price: 32,
    title: "Lounge access",
  },
  {
    description: "Support verified lower-emission aviation fuel for your trip.",
    id: "saf",
    price: 9,
    title: "Lower-impact fuel",
  },
];

function questionOf(step: CheckInStep): AskUserQuestion {
  if (step === "baggage") {
    return {
      id: step,
      options: BAGS.map(({ id, title, description }) => ({
        description,
        id,
        title,
      })),
      skippable: false,
      title: "Checked baggage",
    };
  }
  if (step === "cabin-bag") {
    return {
      id: step,
      options: [
        {
          description: "One 18 lb bag included",
          id: CABIN_BAG,
          title: "Bring a cabin bag",
        },
        { id: "none", title: "No cabin bag" },
      ],
      skippable: false,
      title: "Cabin bag",
    };
  }
  return {
    id: step,
    layout: "stacked",
    multiSelect: true,
    nextLabel: "Review",
    options: EXTRAS.map(({ id, title, description, price }) => ({
      description: `${description} ${formatPrice(price)}`,
      id,
      title,
    })),
    title: "Extras",
  };
}

/**
The questions for these steps, for AskUserQuestions. Read the picks back with checkInDraftOf.
*/
export function checkInQuestionsOf(
  steps: readonly CheckInStep[]
): AskUserQuestion[] {
  return steps.map((step) => questionOf(step));
}

/**
The picks from the answers and the seat picked on the map. A question that wasn't asked keeps the booking as it is: no checked bag, the cabin bag, no extras. A seat that isn't on the map keeps the booked one.
*/
export function checkInDraftOf(
  { pass, seatMap }: CheckInData,
  answers: Record<string, AskUserAnswer>,
  seat: string
): CheckInDraft {
  const bagsId = answers.baggage?.selectedIds[0];
  const extraIds = answers.extras?.skipped
    ? []
    : (answers.extras?.selectedIds ?? []);
  const cabinBagId = answers["cabin-bag"]?.selectedIds[0] ?? CABIN_BAG;
  const booked: SeatOption = {
    current: true,
    legroom: false,
    position: "aisle",
    price: 0,
    seat: pass.seat,
    ...seatOptionOf(seatMap, pass.seat),
  };
  return {
    bags: BAGS.find((bag) => bag.id === bagsId) ?? BAGS[0],
    cabinBag: cabinBagId === CABIN_BAG,
    extras: EXTRAS.filter((extra) => extraIds.includes(extra.id)),
    seat: seatOptionOf(seatMap, seat) ?? booked,
  };
}

/**
What the picks cost, one line each; included picks are left out.
*/
export function priceLinesOf({ bags, seat, extras }: CheckInDraft) {
  const lines: PriceLine[] = [];
  if (bags.price > 0) {
    lines.push({ label: bags.title, price: bags.price });
  }
  if (seat.price > 0) {
    const legroom = seat.legroom ? ", extra legroom" : "";
    lines.push({ label: `Seat ${seat.seat}${legroom}`, price: seat.price });
  }
  for (const extra of extras) {
    lines.push({ label: extra.title, price: extra.price });
  }
  return lines;
}
