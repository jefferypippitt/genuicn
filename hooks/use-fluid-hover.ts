"use client";

import {
  useRef,
  useState,
  useCallback,
  useEffect,
  useLayoutEffect,
} from "react";
import type { Dispatch, RefObject, SetStateAction } from "react";

export interface ItemRect {
  top: number;
  height: number;
  left: number;
  width: number;
}

export interface UseFluidHoverOptions {
  /**
   * Which direction to resolve the nearest item along.
   *   "y"  — vertical lists (default): closest by top/height
   *   "x"  — horizontal strips: closest by left/width
   *   "xy" — 2-D grids: closest card across both rows AND columns,
   *          measured by Euclidean distance to each item's center
   */
  axis?: "x" | "y" | "xy";
  /**
   * Makes an item invisible to hit-testing without unregistering it — for
   * rows that stay mounted while clipped away (a collapsed sub-tree).
   * Unregistering would invalidate every measurement; a skipped item keeps the set stable. Consulted per mouse move, so keep it cheap.
   */
  isItemDisabled?: (element: HTMLElement) => boolean;
  /**
   * Whether a click that lands between items (a gap, the padding, past the
   * last row) is routed to the highlighted item, so what is lit is what a
   * click hits. On by default: in a menu or a list the highlight is a
   * promise about the click. Pass `false` where empty space should stay
   * inert (rows with destructive actions, generous whitespace), or
   * `{ maxDistance }` to route only clicks within that many pixels of the
   * highlighted item's edge.
   */
  gapClick?: boolean | { maxDistance?: number };
}

export interface UseFluidHoverReturn {
  activeIndex: number | null;
  setActiveIndex: Dispatch<SetStateAction<number | null>>;
  itemRects: ItemRect[];
  /**
   * True once every registered item has been measured and no remeasure is
   * pending, i.e. `itemRects` describes the current item set. Gate absolutely
   * positioned overlays on it: an overlay that mounts against a rect a later
   * pass still corrects animates from the wrong place to the right one, which
   * reads as the highlight sliding in from another row.
   */
  isMeasured: boolean;
  /**
   * Counts pointer entries. It steps when the pointer, having entered the
   * container, first moves the highlight, so the highlight keyed on it fades
   * in at the new row instead of sliding over from where it was last (a row
   * lit from the keyboard, or one still fading out).
   */
  session: number;
  /**
  The same count as `session`, for code that reads it outside a render.
  */
  sessionRef: RefObject<number>;
  handlers: {
    /** Picks the item nearest the pointer. Moves that happened in a
     *  portalled child (a row's own dropdown) are ignored. */
    onMouseMove: (e: React.MouseEvent) => void;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
    /**
     * Routes a click that lands between items (a gap, the padding, past the
     * last row) to the highlighted item, so the highlight and the click agree:
     * what is lit is what a click hits. A click inside an item is left to the
     * item, and so is one on a control between items (a search field) or
     * from a portalled child (a row's own dropdown): it never landed between
     * these items. Disabled items (`isItemDisabled`) are never activated.
     */
    onClick: (e: React.MouseEvent) => void;
  };
  registerItem: (index: number, element: HTMLElement | null) => void;
  /**
   * Invalidates the published rects and runs the hook's coalesced measurement
   * pass again, holding `isMeasured` false until it settles. Reach for it when
   * the rects may be wrong and showing an overlay against them would misplace
   * it: a popup that stays mounted between opens keeps its items registered,
   * so nothing else would notice that its rects were taken while it was
   * hidden. Registration, item resize, and container resize already trigger
   * a pass; do not call this on `children` changes.
   */
  remeasure: () => void;
  /**
   * Re-reads the rects synchronously, keeping `isMeasured` as it is. Only for
   * layout that moves the rows under a visible overlay frame by frame (the
   * accordion re-measures inside its height animation). Everything else
   * wants `remeasure`, or nothing.
   */
  measureItems: () => void;
}

export interface PickNearestInput {
  axis: "x" | "y" | "xy";
  /**
  The pointer, in viewport coordinates.
  */
  point: { x: number; y: number };
  /** Item rects in the container's layout space (sparse: unregistered slots
   *  are undefined). */
  rects: readonly (ItemRect | undefined)[];
  /**
  The container's bounding rect and live scroll / border offsets, which map layout rects into the pointer's viewport space.
  */
  containerRect: { left: number; top: number; width: number; height: number };
  scroll: { x: number; y: number };
  border: { x: number; y: number };
  /** Layout size of the container, so a cumulative ancestor `transform:
   *  scale` (a popup mid scale-in) can be factored out per axis. */
  layoutSize: { width: number; height: number };
  /**
  Skips an item without unregistering it.
  */
  isDisabled?: (index: number) => boolean;
}

/**
 * The rule, as one pure function: an item the pointer is inside wins;
 * otherwise the item whose center is nearest does, so a pointer in a gap, in
 * the padding, or past the last row still lands. `y` and `x` measure one
 * coordinate; `xy` measures the straight line to each center. Ties keep the
 * first item. The hook calls this once per animation frame; the docs page
 * times it.
 */
export function pickNearest({
  axis,
  point,
  rects,
  containerRect,
  scroll,
  border,
  layoutSize,
  isDisabled,
}: PickNearestInput): number | null {
  const scaleX =
    layoutSize.width > 0 ? containerRect.width / layoutSize.width : 1;
  const scaleY =
    layoutSize.height > 0 ? containerRect.height / layoutSize.height : 1;
  let closestIndex: number | null = null;
  let closestDistance = Infinity;
  let containingIndex: number | null = null;

  for (const [index, r] of rects.entries()) {
    if (!r || isDisabled?.(index)) {
      continue;
    }

    if (axis === "xy") {
      const left = containerRect.left + (border.x + r.left - scroll.x) * scaleX;
      const top = containerRect.top + (border.y + r.top - scroll.y) * scaleY;
      const width = r.width * scaleX;
      const height = r.height * scaleY;
      if (
        point.x >= left &&
        point.x <= left + width &&
        point.y >= top &&
        point.y <= top + height
      ) {
        containingIndex = index;
      }
      const distance = Math.hypot(
        point.x - (left + width / 2),
        point.y - (top + height / 2)
      );
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
      continue;
    }

    const isHorizontal = axis === "x";
    const mousePos = isHorizontal ? point.x : point.y;
    const scale = isHorizontal ? scaleX : scaleY;
    const itemStart =
      (isHorizontal ? containerRect.left : containerRect.top) +
      ((isHorizontal ? border.x : border.y) +
        (isHorizontal ? r.left : r.top) -
        (isHorizontal ? scroll.x : scroll.y)) *
        scale;
    const itemSize = (isHorizontal ? r.width : r.height) * scale;
    if (mousePos >= itemStart && mousePos <= itemStart + itemSize) {
      containingIndex = index;
    }
    const distance = Math.abs(mousePos - (itemStart + itemSize / 2));
    if (!(distance < closestDistance)) {
      continue;
    }

    closestDistance = distance;
    closestIndex = index;
  }

  return containingIndex ?? closestIndex;
}

/**
 * Whether an event happened inside the element whose handler hears it.
 * React bubbles events from portalled children (a dropdown opened from a
 * row, a submenu, a tooltip) through their React ancestors, so a list's
 * handlers also hear moves, clicks and focus changes that happened in
 * another layer. The hook's own move and click handlers skip those; a
 * consumer with handlers of its own (focus, keys) can call this too. A bare
 * point with no target (a caller re-picking at a remembered position)
 * counts as the list's own.
 */
export function isOwnEvent(e: {
  currentTarget?: EventTarget | null;
  target?: EventTarget | null;
}) {
  const { currentTarget, target } = e;
  return !(currentTarget instanceof Node) || !(target instanceof Node)
    ? true
    : currentTarget.contains(target);
}

/**
Set on the highlighted item (boolean attribute).
*/
export const ACTIVE_ATTR = "data-fluid-hover-active";
/**
Set on the container: the highlighted index, or absent.
*/
export const ACTIVE_INDEX_ATTR = "data-fluid-hover-active-index";

const ACTIVATOR_SELECTOR =
  "a[href], button, [role='menuitem'], [role='menuitemradio'], [role='menuitemcheckbox'], [role='option'], [role='radio'], [role='checkbox'], [role='tab'], [role='link'], [role='button']";

/**
 * The element a routed click should land on. A registered item is usually
 * the interactive row itself; when it is only a box around one (a sidebar
 * row around its button, a card around its link), the first control inside
 * is what a real click on the row would have reached.
 */
function resolveActivator(element: HTMLElement): HTMLElement {
  return element.matches(ACTIVATOR_SELECTOR) || element.hasAttribute("tabindex")
    ? element
    : (element.querySelector<HTMLElement>(ACTIVATOR_SELECTOR) ?? element);
}

const useIsoLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * How many frames the coalesced remeasure retries while the registered items still have no layout box. A popup can be in the DOM one frame before it is laid out; retrying beats publishing zeroed rects, and the cap keeps a list that stays hidden for good from spinning frames forever.
 */
const measurementAttempts = 3;

export function useFluidHover<T extends HTMLElement>(
  containerReference: RefObject<T | null>,
  options: UseFluidHoverOptions = {}
): UseFluidHoverReturn {
  const { axis = "y", isItemDisabled, gapClick = true } = options;
  const gapClickMaxDistance =
    typeof gapClick === "object"
      ? (gapClick.maxDistance ?? Infinity)
      : Infinity;
  const itemsReference = useRef(new Map<number, HTMLElement>());
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  // Mirrored for handlers that read it outside a render (the gap click, a
  // row registering). Written in a layout effect, which runs before any
  // row's registration effect in the same commit.
  const activeIndexReference = useRef<number | null>(null);
  useIsoLayoutEffect(() => {
    activeIndexReference.current = activeIndex;
  }, [activeIndex]);

  // The state, in the DOM: `data-fluid-hover-active` on the highlighted item
  // and `data-fluid-hover-active-index` on the container. Devtools shows it
  // and a test asserts on it without waiting for a frame. React does not
  // manage these attributes, so it never clobbers them.
  useEffect(() => {
    const container = containerReference.current;
    // The registry map itself, which is never replaced: the cleanup reads
    // who holds the index by then, not who held it now.
    const items = itemsReference.current;
    if (activeIndex === null) {
      container?.removeAttribute(ACTIVE_INDEX_ATTR);
    } else {
      container?.setAttribute(ACTIVE_INDEX_ATTR, String(activeIndex));
    }
    const active = activeIndex === null ? undefined : items.get(activeIndex);
    active?.setAttribute(ACTIVE_ATTR, "");
    return () => {
      active?.removeAttribute(ACTIVE_ATTR);
      // A row that re-registered under this index while it was highlighted
      // (a remount under a new key) was marked by registerItem, not by this
      // effect: drop the mark from whatever element holds the index now.
      if (activeIndex !== null) {
        items.get(activeIndex)?.removeAttribute(ACTIVE_ATTR);
      }
    };
  }, [activeIndex, containerReference]);
  const [itemRects, setItemRects] = useState<ItemRect[]>([]);
  const [isMeasured, setIsMeasured] = useState(false);
  const itemRectsReference = useRef<ItemRect[]>([]);
  const [session, setSession] = useState(0);
  const sessionReference = useRef(0);
  // Set when the pointer enters; the pointer's first change of highlight
  // starts the new session, in the same update as the change itself.
  const sessionPendingReference = useRef(false);
  const rafIdReference = useRef<number | null>(null);
  const remeasureRafIdReference = useRef<number | null>(null);

  /**
   * Publishes a rect for every registered item. Returns false when the
   * measurement could not be completed (no container, or an item without a
   * layout box) — nothing is published in that case, so the last complete
   * measurement stands instead of being overwritten with zeroes.
   */
  const runMeasurement = useCallback(() => {
    const container = containerReference.current;
    if (!container) {
      return false;
    }
    const rects: ItemRect[] = [];
    let isEveryItemHasLayout = true;
    itemsReference.current.forEach((element, index) => {
      // An element inside a display:none / not-yet-laid-out popup has no
      // offsetParent and reports every offset as 0. Publishing that would pin
      // overlays to the top of the list, so treat the whole pass as
      // incomplete. A boxless element is the only case: `position: fixed`
      // items also have no offsetParent but do have a size.
      const hasLayoutBox =
        element.offsetParent !== null ||
        element.offsetWidth > 0 ||
        element.offsetHeight > 0;
      if (!hasLayoutBox) {
        isEveryItemHasLayout = false;
        return;
      }
      // Use offset* instead of getBoundingClientRect so measurements are
      // unaffected by CSS transforms (e.g. scaleY animation on the parent
      // motion.div). offsetTop/offsetLeft are layout values relative to the
      // offsetParent (the scroll container), matching the coordinate space
      // used by `position: absolute` children. Items nested inside positioned
      // descendants of the container (a sidebar sub-menu's rows live inside a
      // positioned row) accumulate those ancestors' offsets, so every rect
      // lands in the container's own coordinate space; for a flat list the
      // loop never runs and this is exactly the plain offsetTop/offsetLeft.
      let top = element.offsetTop;
      let left = element.offsetLeft;
      let ancestor = element.offsetParent as HTMLElement | null;
      while (
        ancestor &&
        ancestor !== container &&
        container.contains(ancestor)
      ) {
        top += ancestor.offsetTop + ancestor.clientTop;
        left += ancestor.offsetLeft + ancestor.clientLeft;
        ancestor = ancestor.offsetParent as HTMLElement | null;
      }
      rects[index] = {
        top,
        height: element.offsetHeight,
        left,
        width: element.offsetWidth,
      };
    });
    if (!isEveryItemHasLayout) {
      return false;
    }
    // Skip the state update when nothing moved (a cheap top/left/width/height
    // compare) so redundant remeasures don't churn re-renders.
    const previous = itemRectsReference.current;
    let isChanged = previous.length !== rects.length;
    for (let i = 0; !isChanged && i < rects.length; i++) {
      const p = previous[i];
      const r = rects[i];
      if (p === r) {
        continue;
      } // both undefined (sparse slot)
      isChanged =
        !p ||
        !r ||
        p.top !== r.top ||
        p.left !== r.left ||
        p.width !== r.width ||
        p.height !== r.height;
    }
    if (isChanged) {
      itemRectsReference.current = rects;
      setItemRects(rects);
    }
    return true;
  }, [containerReference]);

  const measureItems = useCallback(() => {
    runMeasurement();
  }, [runMeasurement]);

  /**
   * The hook's single measurement pass: coalesces every trigger (item
   * registration, container resize) into one remeasure on the next frame and
   * is the only place readiness is reported, so `isMeasured` can never turn
   * true while another pass is still queued.
   */
  const scheduleMeasurement = useCallback(
    (attempts: number) => {
      const attempt = (attemptsLeft: number) => {
        if (remeasureRafIdReference.current !== null) {
          cancelAnimationFrame(remeasureRafIdReference.current);
        }
        remeasureRafIdReference.current = requestAnimationFrame(() => {
          remeasureRafIdReference.current = null;
          if (runMeasurement()) {
            setIsMeasured(true);
          } else if (attemptsLeft > 1) {
            attempt(attemptsLeft - 1);
          }
        });
      };
      attempt(attempts);
    },
    [runMeasurement]
  );

  const remeasure = useCallback(() => {
    // Readiness drops first: until the pass below settles, the published rects
    // may not describe what is on screen, and an overlay positioned from them
    // would be corrected after mounting — which animates as a slide.
    setIsMeasured(false);
    scheduleMeasurement(measurementAttempts);
  }, [scheduleMeasurement]);

  // Observes the registered items themselves (not just the container): rows
  // that change size in place — e.g. the site-wide size step flipping while a
  // selection background is up — must invalidate the published rects even when
  // the container the effect below captured has since been remounted and the
  // ref points at a different element than the one being observed.
  const itemRoReference = useRef<ResizeObserver | null>(null);
  const getItemRo = useCallback(() => {
    if (
      itemRoReference.current === null &&
      typeof ResizeObserver !== "undefined"
    ) {
      itemRoReference.current = new ResizeObserver(() =>
        scheduleMeasurement(measurementAttempts)
      );
    }
    return itemRoReference.current;
  }, [scheduleMeasurement]);

  const registerItem = useCallback(
    (index: number, element: HTMLElement | null) => {
      if (element) {
        itemsReference.current.set(index, element);
        getItemRo()?.observe(element);
        if (index === activeIndexReference.current) {
          element.setAttribute(ACTIVE_ATTR, "");
        }
      } else {
        const previous = itemsReference.current.get(index);
        if (previous) {
          itemRoReference.current?.unobserve(previous);
        }
        // The mark leaves with the element: a row that only moved to another
        // index (a filtering list re-ordering) must not carry it there.
        previous?.removeAttribute(ACTIVE_ATTR);
        itemsReference.current.delete(index);
        // The highlighted row is gone: nothing should stay lit or receive a
        // routed click until the pointer picks again. Decided when the
        // update applies, after this commit's registrations, so a row that
        // only moved index hands the highlight to the row now under it.
        if (index === activeIndexReference.current) {
          setActiveIndex((current) =>
            current === index && !itemsReference.current.has(index)
              ? null
              : current
          );
        }
      }
      // Coalesce rapid register/unregister calls (e.g. when an AnimatePresence
      // remounts a list of rows) into a single remeasure on the next frame,
      // so consumers don't have to manually call measureItems after the
      // container's children swap.
      remeasure();
    },
    [remeasure, getItemRo]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isOwnEvent(e)) {
        return;
      }
      const mouseX = e.clientX;
      const mouseY = e.clientY;

      if (rafIdReference.current !== null) {
        cancelAnimationFrame(rafIdReference.current);
      }

      rafIdReference.current = requestAnimationFrame(() => {
        rafIdReference.current = null;
        const container = containerReference.current;
        if (!container) {
          return;
        }
        const next = pickNearest({
          axis,
          point: { x: mouseX, y: mouseY },
          rects: itemRectsReference.current,
          containerRect: container.getBoundingClientRect(),
          scroll: { x: container.scrollLeft, y: container.scrollTop },
          border: { x: container.clientLeft, y: container.clientTop },
          layoutSize: {
            width: container.offsetWidth,
            height: container.offsetHeight,
          },
          isDisabled: isItemDisabled
            ? (index) => {
                const element = itemsReference.current.get(index);
                return !!element && isItemDisabled(element);
              }
            : undefined,
        });
        if (
          sessionPendingReference.current &&
          next !== activeIndexReference.current
        ) {
          sessionPendingReference.current = false;
          sessionReference.current += 1;
          setSession(sessionReference.current);
        }
        setActiveIndex(next);
      });
    },
    [axis, containerReference, isItemDisabled]
  );

  const handleMouseEnter = useCallback(() => {
    sessionPendingReference.current = true;
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (rafIdReference.current !== null) {
      cancelAnimationFrame(rafIdReference.current);
      rafIdReference.current = null;
    }
    setActiveIndex(null);
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as Node | null;
      if (!target) {
        return;
      }
      // Inside an item: the item owns the click.
      for (const element of itemsReference.current.values()) {
        if (element.contains(target)) {
          return;
        }
      }
      // A row that unmounted while its own click was still bubbling (a pick
      // whose primitive re-renders the list synchronously, like a "create"
      // row that becomes a real item) already landed; it is not a gap.
      if (!target.isConnected) {
        return;
      }
      // Nor is a click from something rendered through a portal (a dropdown
      // opened from a row, a submenu): it bubbles here through React, but it
      // never happened between these rows.
      if (!isOwnEvent(e)) {
        return;
      }
      // A control that sits between the rows (a search field at the top of
      // a menu, a footer button) keeps its own click too.
      const control = (target as Element).closest?.(
        "input, textarea, select, button, a, summary, [contenteditable], [role='textbox'], [role='searchbox'], [role='button']"
      );
      if (control || gapClick === false) {
        return;
      }
      const index = activeIndexReference.current;
      if (index === null) {
        return;
      }
      const element = itemsReference.current.get(index);
      if (!element || isItemDisabled?.(element)) {
        return;
      }
      if (gapClickMaxDistance !== Infinity) {
        const r = element.getBoundingClientRect();
        const dx = Math.max(r.left - e.clientX, 0, e.clientX - r.right);
        const dy = Math.max(r.top - e.clientY, 0, e.clientY - r.bottom);
        if (Math.hypot(dx, dy) > gapClickMaxDistance) {
          return;
        }
      }
      // A real DOM click on the item, so its own handlers (and the primitive
      // wrapping it, if any) run exactly as if the pointer had been inside.
      resolveActivator(element).click();
    },
    [isItemDisabled, gapClick, gapClickMaxDistance]
  );

  // Remeasure when the container resizes — a reflow moves items even though
  // the registered set is unchanged, which would otherwise leave itemRects
  // stale. Coalesced through the same rAF as register/unregister. Readiness is
  // deliberately not dropped: the item set is unchanged, so the published rects
  // stay usable, and hiding overlays on every reflow would flicker them.
  useEffect(() => {
    const container = containerReference.current;
    if (!container || typeof ResizeObserver === "undefined") {
      return;
    }
    const ro = new ResizeObserver(() =>
      scheduleMeasurement(measurementAttempts)
    );
    ro.observe(container);
    return () => ro.disconnect();
  }, [containerReference, scheduleMeasurement]);

  // Clean up rAF and the item observer on unmount
  useEffect(() => {
    return () => {
      if (rafIdReference.current !== null) {
        cancelAnimationFrame(rafIdReference.current);
      }
      if (remeasureRafIdReference.current !== null) {
        cancelAnimationFrame(remeasureRafIdReference.current);
      }
      itemRoReference.current?.disconnect();
      itemRoReference.current = null;
    };
  }, []);

  return {
    activeIndex,
    setActiveIndex,
    itemRects,
    isMeasured,
    session,
    sessionRef: sessionReference,
    handlers: {
      onMouseMove: handleMouseMove,
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
      onClick: handleClick,
    },
    registerItem,
    remeasure,
    measureItems,
  };
}

/**
 * Registers an item's element with its list for as long as it is mounted.
 * The one way rows join a list: pass the hook's `registerItem` (or the copy
 * a context hands down), the row's index, and its ref. Either may be
 * missing for a row rendered outside a list (a standalone card, an accordion
 * item that is not grouped); then nothing is registered.
 */
export function useRegisterFluidHoverItem(
  registerItem:
    ((index: number, element: HTMLElement | null) => void) | undefined,
  index: number | undefined,
  reference: RefObject<HTMLElement | null>
) {
  useEffect(() => {
    if (!registerItem || index === undefined) {
      return;
    }
    registerItem(index, reference.current);
    return () => registerItem(index, null);
  }, [index, registerItem, reference]);
}
