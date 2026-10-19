import { DocPage } from "@/components/docs/doc-page";
import { ChangelogView } from "@/components/changelog/changelog-view";
import { loadReleases, releaseLabel } from "@/lib/changelog/load";
import type { Metadata } from "next";

const DESCRIPTION = "The cards genuicn has added, month by month.";

export const metadata: Metadata = {
  title: "Changelog · genuicn",
  description: DESCRIPTION,
};

export default function ChangelogPage() {
  const releases = loadReleases().map((release) => ({
    ...release,
    label: releaseLabel(release.month),
  }));
  return (
    <DocPage title="Changelog" description={DESCRIPTION} href="/changelog">
      <ChangelogView releases={releases} />
    </DocPage>
  );
}
