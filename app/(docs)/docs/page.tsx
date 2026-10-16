import { DocPage, DocPrinciples } from "@/components/docs/doc-page";
import type { Metadata } from "next";

const DESCRIPTION =
  "The model picks a card. Your server fills it in, while the reply is still streaming.";

export const metadata: Metadata = {
  description: DESCRIPTION,
  title: "Introduction · genuicn",
};

const PRINCIPLES = [
  {
    body: "The model replies with a short sentence and a json-render spec that names a card and a few props, like a ticker and a range. The model never writes a number. The card fetches the rest from a real source on your server. A price on screen is the price the quote service returned.",
    title: "Data the model can't make up",
  },
  {
    body: "Cards render while the model is still writing them. The ticker fills in as it streams, a loading state holds the space while the data arrives, and an error state says what went wrong. Those states keep the card's place in the chat.",
    title: "Streaming, loading, and error",
  },
  {
    body: "A card ships with a catalog entry. The entry lists the props the model may write, checks them with Zod, and describes when to show the card.",
    title: "A catalog the model can read",
  },
  {
    body: "Cards use your shadcn/ui theme tokens (colors, corner radius, fonts), and the chat is built on Fluid Functionalism.",
    title: "Your theme",
  },
  {
    body: "Card pages replay real model replies, recorded chunk by chunk with their timing, and the recording also holds the data each card loaded. The playground reads the recording, so a click never calls a model or a data service. Press D to switch between light and dark mode.",
    title: "Recorded chats",
  },
] as const;

export default function IntroductionPage() {
  return (
    <DocPage title="Introduction" href="/docs" description={DESCRIPTION}>
      <DocPrinciples items={PRINCIPLES} />
    </DocPage>
  );
}
