"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useIcons } from "@/lib/icon-context";

export default function GalleryActions() {
  const icons = useIcons();
  return (
    <>
      <Button
        leadingIcon={icons.rocket}
        render={<Link href="/docs/installation" />}
      >
        Get started
      </Button>
      <Button
        variant="secondary"
        leadingIcon={icons.info}
        render={<Link href="/docs" />}
      >
        See how
      </Button>
    </>
  );
}
