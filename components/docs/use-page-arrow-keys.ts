"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { PAGE_ORDER } from "@/components/sidebar-app/nav-data";

const ARROW_KEY_OWNERS =
  "[role=slider],[role=tablist],[role=radiogroup],[role=listbox],[role=menu],[role=menubar]";

export function usePageArrowKeys() {
  const router = useRouter();
  const pathname = usePathname();
  const indexReference = useRef(-1);

  useEffect(() => {
    indexReference.current = PAGE_ORDER.findIndex(
      (page) => page.href === pathname
    );
  }, [pathname]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
        return;
      }
      if (
        event.defaultPrevented ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.shiftKey
      ) {
        return;
      }
      const { target } = event;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) ||
          target.closest(ARROW_KEY_OWNERS))
      ) {
        return;
      }
      const { current } = indexReference;
      if (current === -1) {
        return;
      }
      const next = event.key === "ArrowLeft" ? current - 1 : current + 1;
      if (next < 0 || next >= PAGE_ORDER.length) {
        return;
      }
      event.preventDefault();
      indexReference.current = next;
      router.push(PAGE_ORDER[next].href);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);
}
