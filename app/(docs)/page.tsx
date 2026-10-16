import { DocPage } from "@/components/docs/doc-page";
import GalleryGrid from "@/features/home/components/gallery-grid";

export default function HomePage() {
  return (
    <DocPage
      title="Generative UI cards for your chatbot"
      description="Give your chatbot something to show for itself. Live cards, ready to drop in."
      href="/"
    >
      <GalleryGrid />
    </DocPage>
  );
}
