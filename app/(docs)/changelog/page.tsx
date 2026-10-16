import { DocPage } from "@/components/docs/doc-page";
import { ChangelogView } from "@/components/changelog/changelog-view";
import { loadReleases, monthLabel } from "@/lib/changelog/load";
import type { Metadata } from "next";

const DESCRIPTION = "Every change to genuicn, month by month.";

export const metadata: Metadata = {
  title: "Changelog · genuicn",
  description: DESCRIPTION,
};

export default function ChangelogPage() {
  const releases = loadReleases().map((release) => ({
    ...release,
    monthLabel: monthLabel(release.month),
  }));
  return (
    <DocPage title="Changelog" description={DESCRIPTION} href="/changelog">
      <ChangelogView releases={releases} />
    </DocPage>
  );
}
