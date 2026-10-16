import { DocPage } from "@/components/docs/doc-page";
import GalleryCarousel from "@/features/home/components/gallery-carousel";

export default function HomePage() {
  return (
    <DocPage
      title="Generative UI cards for your chatbot"
      description="Give your chatbot something to show for itself. Live cards, ready to drop in."
      href="/"
    >
      <GalleryCarousel />
    </DocPage>
  );
}
