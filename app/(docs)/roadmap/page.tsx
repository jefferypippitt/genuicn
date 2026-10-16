import { DocPage } from "@/components/docs/doc-page";
import { RoadmapView } from "@/components/docs/roadmap-view";
import type { Metadata } from "next";

const DESCRIPTION =
  "The cards we plan to build, by topic. The order and scope may change.";

export const metadata: Metadata = {
  title: "Roadmap · genuicn",
  description: DESCRIPTION,
};

export default function RoadmapPage() {
  return (
    <DocPage title="Roadmap" description={DESCRIPTION} href="/roadmap">
      <RoadmapView />
    </DocPage>
  );
}
