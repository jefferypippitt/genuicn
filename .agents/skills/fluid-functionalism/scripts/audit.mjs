// Measure a running page against Fluid Functionalism's invariants.
//
// The stack audit reads source, and source cannot answer the questions most
// FF advice turns on: whether a list's hover glides or blinks off between
// rows, whether selecting a tab shoves its neighbours, which transition
// durations survive the cascade, which control heights actually ship, and
// whether the loaded font can render a weight change at all. This loads the
// page in a headless browser, moves a real pointer, and prints what it
// measured.
//
// It reports; it does not judge. Every line is evidence for the gate in
// references/stack-audit.md#the-evidence-gate, never a recommendation on its
// own — a per-row hover can be the right call, and a 150ms transition can be
// a documented exception.
//
//   node scripts/audit.mjs http://localhost:3000/settings
//   node scripts/audit.mjs <url> --widths 1280,390 --json audit.json
//
// Needs playwright-core (`npm install` in this folder) and a Chromium: the
// Playwright download, a local Chrome, or one named by CHROME_PATH.

import { existsSync, readdirSync, realpathSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/** CSS transition durations FF ships (registry/: `duration-80` dominates;
 *  160/240/120 match the spring tiers and their exits; 180 is the button's
 *  press release; 60 is the fast exit). Anything else is off the system —
 *  Tailwind's bare `transition` class is 150ms, the usual culprit. */
export const DURATION_TOKENS_MS = [0, 60, 80, 120, 160, 180, 240];

/**
The size ladder: default controls are 36px (`h-9`), compact 28px (`h-7`).
*/
export const LADDER_PX = [28, 36];

/**
"0.15s, 80ms" → [150, 80].
*/
export function parseDurations(value) {
  return String(value)
    .split(",")
    .map((part) => {
      const s = part.trim();
      if (s.endsWith("ms")) {
        return Number.parseFloat(s);
      }
      return s.endsWith("s") ? Number.parseFloat(s) * 1000 : NaN;
    })
    .filter((n) => !Number.isNaN(n))
    .map((n) => Math.round(n));
}

export const isOnToken = (ms) => DURATION_TOKENS_MS.includes(ms);

export const isOnLadder = (px, tolerance = 1) =>
  LADDER_PX.some((h) => Math.abs(px - h) <= tolerance);

/**
What a list does when the pointer rests on a row. FF's hook marks its container with data-fluid-hover-active-index, so its glide is identified exactly; any other moving overlay is a hand-rolled glide; a row that repaints its own background is a per-row hover.
*/
export function classifyHover({ ffAttr, overlayMoved, rowFill }) {
  if (ffAttr) {
    return "glide";
  }
  if (overlayMoved) {
    return "custom-glide";
  }
  return rowFill ? "per-row" : "none";
}

function parseArguments(argv) {
  const arguments_ = { url: null, widths: [1280, 390], json: null, lists: 8 };
  for (let index = 0; index < argv.length; index++) {
    const a = argv[index];
    switch (a) {
      case "--widths": {
        arguments_.widths = argv[++index].split(",").map(Number);
        break;
      }
      case "--json": {
        arguments_.json = argv[++index];
        break;
      }
      case "--lists": {
        arguments_.lists = Number(argv[++index]);
        break;
      }
      default: {
        if (!arguments_.url) {
          arguments_.url = a;
        }
      }
    }
  }
  return arguments_;
}

function downloadedChromium() {
  const roots = [
    process.env.PLAYWRIGHT_BROWSERS_PATH,
    join(homedir(), ".cache", "ms-playwright"),
    join(homedir(), "Library", "Caches", "ms-playwright"),
  ].filter(Boolean);
  const found = [];
  for (const root of roots) {
    if (!existsSync(root)) {
      continue;
    }
    for (const dir of readdirSync(root)
      .filter((d) => d.startsWith("chromium-"))
      .sort()
      .reverse()) {
      for (const bin of [
        "chrome-linux/chrome",
        "chrome-mac/Chromium.app/Contents/MacOS/Chromium",
        "chrome-win/chrome.exe",
      ]) {
        const path = join(root, dir, bin);
        if (existsSync(path)) {
          found.push(path);
        }
      }
    }
  }
  return found;
}

async function launch() {
  let chromium;
  try {
    ({ chromium } = await import("playwright-core"));
  } catch {
    throw new Error(
      "playwright-core is not installed. Run `npm install` in this scripts folder."
    );
  }
  const attempts = [
    ...(process.env.CHROME_PATH
      ? [{ executablePath: process.env.CHROME_PATH }]
      : []),
    {},
    { channel: "chrome" },
    ...downloadedChromium().map((executablePath) => ({ executablePath })),
  ];
  let last;
  for (const options of attempts) {
    try {
      return await chromium.launch(options);
    } catch (error) {
      last = error;
    }
  }
  throw new Error(
    `No Chromium could be launched. Install Chrome, run \`npx playwright install chromium\`, or set CHROME_PATH. (${String(last?.message).split("\n", 1)[0]})`
  );
}

// ---------------------------------------------------------------------------
// Page-side probes. Each runs inside the page, so each is self-contained.
// ---------------------------------------------------------------------------

function installHelpers() {
  const path = (element) => {
    const parts = [];
    for (
      let n = element, depth = 0;
      n && n !== document.body && depth < 4;
      n = n.parentElement, depth++
    ) {
      let s = n.tagName.toLowerCase();
      if (n.id) {
        parts.unshift(`${s}#${CSS.escape(n.id)}`);
        break;
      }
      const slot = n.getAttribute("data-slot");
      const aria = n.getAttribute("aria-label");
      if (slot) {
        s += `[data-slot="${slot}"]`;
      } else if (aria) {
        s += `[aria-label="${aria.slice(0, 24)}"]`;
      } else if (n.classList.length) {
        s += `.${[...n.classList]
          .slice(0, 2)
          .map((c) => CSS.escape(c))
          .join(".")}`;
      }
      parts.unshift(s);
    }
    return parts.join(" > ");
  };
  const visible = (element) => {
    const r = element.getBoundingClientRect();
    const cs = getComputedStyle(element);
    return (
      r.width > 8 &&
      r.height >= 16 &&
      cs.visibility !== "hidden" &&
      cs.display !== "none" &&
      cs.opacity !== "0"
    );
  };
  // innerText skips visibility:hidden text, which is what FF's ghost spans
  // are — textContent would read every weight-changing label twice.
  const label = (element) =>
    (
      element.getAttribute("aria-label") ||
      element.textContent ||
      element.textContent ||
      ""
    )
      .trim()
      .replaceAll(/\s+/g, " ")
      .slice(0, 20);
  window.__ffa = { path, visible, label };
}

function tagLists(max) {
  const { path, visible, label } = window.__ffa;
  const ITEM =
    'a[href], button, [role="menuitem"], [role="menuitemradio"], [role="menuitemcheckbox"], [role="option"], [role="tab"], [role="row"], [role="radio"], [role="checkbox"], tr';
  const groups = new Map();
  for (const element of document.querySelectorAll(ITEM)) {
    if (
      !visible(element) ||
      label(element).length < 2 ||
      element.parentElement?.closest(ITEM)
    ) {
      continue;
    }
    let parent = element.parentElement;
    if (parent?.tagName === "LI") {
      parent = parent.parentElement;
    }
    if (!parent) {
      continue;
    }
    if (!groups.has(parent)) {
      groups.set(parent, []);
    }
    groups.get(parent).push(element);
  }
  const lists = [];
  for (const [container, items] of groups) {
    if (items.length < 3) {
      continue;
    }
    const rects = items.map((index) => index.getBoundingClientRect());
    const hs = rects.map((r) => r.height);
    if (Math.max(...hs) > Math.min(...hs) * 1.6) {
      continue;
    }
    const sharedLeft = rects.every(
      (r) => Math.abs(r.left - rects[0].left) <= 2
    );
    const sharedTop = rects.every((r) => Math.abs(r.top - rects[0].top) <= 2);
    if (!sharedLeft && !sharedTop) {
      continue;
    }
    lists.push({ container, items, axis: sharedLeft ? "y" : "x" });
  }
  lists.sort((a, b) => b.items.length - a.items.length);
  return lists.slice(0, max).map((l, index) => {
    l.container.setAttribute("data-ffa-list", String(index));
    l.items.forEach((it, index_) =>
      it.setAttribute("data-ffa-item", `${index}-${index_}`)
    );
    return {
      index,
      count: l.items.length,
      axis: l.axis,
      label: l.items.slice(0, 3).map(label).join(" / "),
      path: path(l.container),
    };
  });
}

function readList(index) {
  const container = document.querySelector(
    `[data-ffa-list="${CSS.escape(index)}"]`
  );
  const items = [
    ...document.querySelectorAll(`[data-ffa-item^="${CSS.escape(index)}-"]`),
  ];
  const rects = items.map((element) => {
    const r = element.getBoundingClientRect();
    return [r.x, r.y, r.width, r.height];
  });
  const fills = items.map((element) => {
    const own = getComputedStyle(element).backgroundColor;
    const child = element.firstElementChild
      ? getComputedStyle(element.firstElementChild).backgroundColor
      : "";
    return `${own}|${child}`;
  });
  const isFfAttribute = Boolean(
    container.closest("[data-fluid-hover-active-index]") ||
    container.querySelector(
      "[data-fluid-hover-active-index], [data-fluid-hover-active]"
    )
  );
  const overlays = [...container.querySelectorAll("*")]
    .filter(
      (element) =>
        !items.some(
          (it) => it === element || it.contains(element) || element.contains(it)
        ) && getComputedStyle(element).position === "absolute"
    )
    .slice(0, 20)
    .map((element) => {
      const r = element.getBoundingClientRect();
      const cs = getComputedStyle(element);
      return [
        Math.round(r.x),
        Math.round(r.y),
        Math.round(r.width),
        Math.round(r.height),
        cs.opacity,
        cs.transform,
      ].join(",");
    })
    .join(";");
  return { rects, fills, ffAttr: isFfAttribute, overlays };
}

function probeTransitions(tokens) {
  const { path } = window.__ffa;
  const parse = (v) => {
    return String(v)
      .split(",")
      .map((s) => s.trim())
      .map((s) =>
        s.endsWith("ms")
          ? parseFloat(s)
          : s.endsWith("s")
            ? parseFloat(s) * 1000
            : NaN
      )
      .map(Math.round);
  };
  const off = {};
  let all = 0;
  const allExamples = [];
  for (const element of document.querySelectorAll("body *")) {
    const cs = getComputedStyle(element);
    if (cs.display === "none") {
      continue;
    }
    const durs = parse(cs.transitionDuration);
    if (durs.every((d) => !(d > 0))) {
      continue;
    }
    const properties = cs.transitionProperty.split(",").map((s) => s.trim());
    const offHere = new Set();
    properties.forEach((p, k) => {
      const d = durs[k % durs.length];
      if (!(d > 0)) {
        return;
      }
      if (p === "all" && !offHere.has("all")) {
        offHere.add("all");
        all++;
        if (allExamples.length < 3) {
          allExamples.push(path(element));
        }
      }
      if (tokens.includes(d) || offHere.has(d)) {
        return;
      }

      offHere.add(d);
      off[d] ??= { count: 0, examples: [] };
      off[d].count++;
      if (off[d].examples.length < 3) {
        off[d].examples.push(`${path(element)} (${p})`);
      }
    });
  }
  return { off, all, allExamples };
}

function probeLadder() {
  const { path, visible } = window.__ffa;
  const CONTROL =
    'button, [role="button"], select, [role="tab"], [role="combobox"], [role="option"], [role="menuitem"], input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="hidden"]), a';
  const heights = {};
  for (const element of document.querySelectorAll(CONTROL)) {
    if (!visible(element)) {
      continue;
    }
    if (element.tagName === "A") {
      const cs = getComputedStyle(element);
      const isBoxed =
        cs.backgroundColor !== "rgba(0, 0, 0, 0)" ||
        Number.parseFloat(cs.borderTopWidth) > 0;
      if (cs.display === "inline" || !isBoxed) {
        continue;
      }
    }
    const h = Math.round(element.getBoundingClientRect().height);
    heights[h] ??= { count: 0, examples: [] };
    heights[h].count++;
    if (heights[h].examples.length < 2) {
      heights[h].examples.push(path(element));
    }
  }
  return heights;
}

function probeFonts() {
  const norm = (f) => f.replaceAll(/["']/g, "").trim().toLowerCase();
  const loaded = [...document.fonts].filter((f) => f.status === "loaded");
  const ranged = new Set(
    loaded.filter((f) => /\d+\s+\d+/.test(f.weight)).map((f) => norm(f.family))
  );
  const known = new Set(loaded.map((f) => norm(f.family)));
  const users = {};
  for (const element of document.querySelectorAll("body *")) {
    const cs = getComputedStyle(element);
    if (!/wght/.test(cs.fontVariationSettings)) {
      continue;
    }
    const fam = norm(cs.fontFamily.split(",", 1)[0]);
    users[fam] = (users[fam] || 0) + 1;
  }
  return Object.entries(users).map(([family, count]) => {
    return {
      family,
      count,
      face: ranged.has(family)
        ? "variable"
        : known.has(family)
          ? "static"
          : "not-loaded",
    };
  });
}

function probeOverflow() {
  const document_ = document.documentElement;
  const width = document_.clientWidth;
  if (document_.scrollWidth <= width + 1) {
    return null;
  }
  let widest = null;
  for (const element of document.querySelectorAll("body *")) {
    const r = element.getBoundingClientRect();
    if (r.right > width + 1 && (!widest || r.right > widest.right)) {
      widest = { right: Math.round(r.right), path: window.__ffa.path(element) };
    }
  }
  return { scrollWidth: document_.scrollWidth, width, widest };
}

// ---------------------------------------------------------------------------
// Pointer-driven checks, run from Node.
// ---------------------------------------------------------------------------

const settle = (page, ms = 280) => page.waitForTimeout(ms);

async function rest(page, viewport) {
  await page.mouse.move(viewport.width - 2, viewport.height - 2);
  await settle(page, 180);
}

function maxShift(before, after, skip) {
  let worst = { delta: 0, index: -1 };
  before.forEach((r, k) => {
    if (k === skip) {
      return;
    }
    const d = Math.max(...r.map((v, n) => Math.abs(v - after[k][n])));
    if (d > worst.delta) {
      worst = { delta: d, index: k };
    }
  });
  return worst;
}

async function hoverLists(page, viewport, max) {
  const lists = await page.evaluate(tagLists, max);
  const results = [];
  for (const list of lists) {
    const rows = Math.min(3, list.count - 1);
    const seen = {
      ffAttr: false,
      overlayMoved: false,
      rowFill: false,
      gapDark: null,
      gap: 0,
      fill: null,
      shift: null,
    };
    for (let index = 0; index < rows; index++) {
      const item = page.locator(`[data-ffa-item="${list.index}-${index}"]`);
      try {
        await item.scrollIntoViewIfNeeded({ timeout: 1500 });
      } catch {
        continue;
      }
      await rest(page, viewport);
      const base = await page.evaluate(readList, list.index);
      const [x, y, w, h] = base.rects[index];
      await page.mouse.move(x + w / 2, y + h / 2, { steps: 4 });
      await settle(page);
      const hovered = await page.evaluate(readList, list.index);
      const isRowFill = hovered.fills[index] !== base.fills[index];
      seen.ffAttr ||= hovered.ffAttr;
      seen.overlayMoved ||= hovered.overlays !== base.overlays;
      seen.rowFill ||= isRowFill;
      if (isRowFill && !seen.fill) {
        seen.fill = hovered.fills[index]
          .split("|")
          .find((f, k) => f !== base.fills[index].split("|")[k]);
      }
      const shift = maxShift(base.rects, hovered.rects, -1);
      if (
        shift.delta > 0.5 &&
        (!seen.shift || shift.delta > seen.shift.delta)
      ) {
        seen.shift = {
          delta: Math.round(shift.delta * 10) / 10,
          hovered: index,
          moved: shift.index,
        };
      }

      // The gap after this row: glide keeps something lit there, per-row goes dark.
      const next = hovered.rects[index + 1];
      const current = hovered.rects[index];
      const gap =
        list.axis === "y"
          ? next[1] - (current[1] + current[3])
          : next[0] - (current[0] + current[2]);
      if (gap >= 2) {
        const gx =
          list.axis === "y"
            ? current[0] + current[2] / 2
            : current[0] + current[2] + gap / 2;
        const gy =
          list.axis === "y"
            ? current[1] + current[3] + gap / 2
            : current[1] + current[3] / 2;
        await page.mouse.move(gx, gy, { steps: 2 });
        await settle(page);
        const inGap = await page.evaluate(readList, list.index);
        const lit =
          inGap.ffAttr ||
          inGap.overlays !== base.overlays ||
          inGap.fills.some((f, k) => f !== base.fills[k]);
        seen.gap = Math.max(seen.gap, Math.round(gap));
        seen.gapDark = (seen.gapDark ?? false) || !lit;
      }
    }
    await rest(page, viewport);
    results.push({ ...list, kind: classifyHover(seen), ...seen });
  }
  return results;
}

async function selectTabs(page, url) {
  const results = [];
  const tablists = page.locator('[role="tablist"]');
  const n = Math.min(await tablists.count(), 3);
  for (let t = 0; t < n; t++) {
    const tabs = tablists.nth(t).locator('[role="tab"]');
    const count = await tabs.count();
    if (count < 2 || !(await tablists.nth(t).isVisible())) {
      continue;
    }
    const rects = async () => {
      return Promise.all(
        [...Array(count).keys()].map(async (k) => {
          const b = await tabs.nth(k).boundingBox();
          return b ? [b.x, b.y, b.width, b.height] : [0, 0, 0, 0];
        })
      );
    };
    let target = -1;
    for (let k = 0; k < count; k++) {
      if (
        (await tabs.nth(k).getAttribute("aria-selected")) !== "true" &&
        (await tabs.nth(k).isVisible())
      ) {
        target = k;
        break;
      }
    }
    if (target === -1) {
      continue;
    }
    const labels = await tablists
      .nth(t)
      .evaluate((element) =>
        [...element.querySelectorAll('[role="tab"]')]
          .slice(0, 3)
          .map(window.__ffa.label)
          .join(" / ")
      );
    const before = await rects();
    await tabs
      .nth(target)
      .click({ timeout: 2000 })
      .catch(() => {});
    await settle(page, 400);
    if (page.url() !== url) {
      await page.goto(url, { waitUntil: "load" });
      await page.evaluate(installHelpers);
      continue;
    }
    const after = await rects();
    const shift = maxShift(before, after, target);
    results.push({
      label: labels,
      selected: target,
      shift: Math.round(shift.delta * 10) / 10,
      moved: shift.index,
    });
  }
  return results;
}

// ---------------------------------------------------------------------------

async function measure(browser, url, width, { pointer, lists }) {
  const viewport = { width, height: 900 };
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "load", timeout: 60_000 });
  await page.evaluate(() => document.fonts.ready);
  await settle(page, 800);
  await page.evaluate(installHelpers);

  const out = { width };
  out.transitions = await page.evaluate(probeTransitions, DURATION_TOKENS_MS);
  out.ladder = await page.evaluate(probeLadder);
  out.fonts = await page.evaluate(probeFonts);
  out.overflow = await page.evaluate(probeOverflow);
  if (pointer) {
    out.hover = await hoverLists(page, viewport, lists);
    out.tabs = await selectTabs(page, url);
  }
  await context.close();
  return out;
}

function report(url, results) {
  const lines = [`Fluid Functionalism audit — ${url}`, ""];
  for (const r of results) {
    lines.push(`── ${r.width}px ${"─".repeat(50)}`);
    if (r.hover) {
      lines.push(`HOVER  ${r.hover.length} list(s) tested`);
      if (!r.hover.length) {
        lines.push("  no labelled lists of 3+ rows found");
      }
      for (const h of r.hover) {
        const what = {
          glide: "FF fluid hover (data-fluid-hover-active-index)",
          "custom-glide":
            "a moving overlay that is not FF's hook — hand-rolled glide",
          "per-row": `each row repaints its own fill${h.fill ? ` (${h.fill})` : ""}`,
          none: "no visible hover response",
        }[h.kind];
        lines.push(`  ${h.kind.padEnd(12)} "${h.label}" — ${what}`);
        lines.push(`  ${"".padEnd(12)} at ${h.path}`);
        if (h.kind === "per-row" && h.gapDark) {
          lines.push(
            `  ${"".padEnd(12)} goes dark in the ${h.gap}px gap between rows`
          );
        }
        if (h.shift) {
          lines.push(
            `  ${"".padEnd(12)} hovering row ${h.hovered + 1} moved row ${h.moved + 1} by ${h.shift}px`
          );
        }
      }
    }
    if (r.tabs) {
      for (const t of r.tabs) {
        lines.push(
          t.shift > 0.5
            ? `SELECT "${t.label}": selecting tab ${t.selected + 1} moved tab ${t.moved + 1} by ${t.shift}px`
            : `SELECT "${t.label}": selecting tab ${t.selected + 1} moved nothing`
        );
      }
    }
    const off = Object.entries(r.transitions.off).sort(
      (a, b) => b[1].count - a[1].count
    );
    lines.push(
      `TRANSITIONS  off FF tokens (${DURATION_TOKENS_MS.join("/")}ms): ${off.length ? "" : "none"}`
    );
    for (const [ms, v] of off) {
      lines.push(
        `  ${`${ms}ms`.padEnd(8)} × ${v.count}  e.g. ${v.examples[0]}`
      );
    }
    if (r.transitions.all) {
      lines.push(
        `  transition-property: all × ${r.transitions.all}  e.g. ${r.transitions.allExamples[0]}`
      );
    }
    const heights = Object.entries(r.ladder).sort(
      (a, b) => b[1].count - a[1].count
    );
    lines.push(`LADDER  control heights (FF: ${LADDER_PX.join(" / ")}px)`);
    lines.push(
      `  ${heights.map(([h, v]) => `${h}px×${v.count}${isOnLadder(+h) ? "" : "*"}`).join("  ") || "no controls found"}`
    );
    const offLadder = heights.filter(([h]) => !isOnLadder(+h));
    for (const [h, v] of offLadder.slice(0, 4)) {
      lines.push(`  * ${h}px e.g. ${v.examples[0]}`);
    }
    lines.push("FONT  families that set font-variation-settings 'wght'");
    if (!r.fonts.length) {
      lines.push("  none");
    }
    for (const f of r.fonts) {
      const note = {
        variable: "variable face loaded — weight changes can render",
        static: "only static faces loaded — weight changes cannot render",
        "not-loaded":
          "no matching web font loaded — the system fallback decides",
      }[f.face];
      lines.push(`  "${f.family}" × ${f.count}: ${note}`);
    }
    lines.push(
      r.overflow
        ? `OVERFLOW  page is ${r.overflow.scrollWidth}px in a ${r.overflow.width}px viewport; widest: ${r.overflow.widest?.path}`
        : "OVERFLOW  none"
    );
    lines.push("");
  }
  lines.push(
    "Evidence, not advice: read references/stack-audit.md#the-evidence-gate before turning any line into a recommendation."
  );
  return lines.join("\n");
}

async function main() {
  const arguments_ = parseArguments(process.argv.slice(2));
  if (!arguments_.url) {
    console.error(
      "usage: node scripts/audit.mjs <url> [--widths 1280,390] [--json out.json] [--lists 8]"
    );
    process.exit(2);
  }
  const browser = await launch();
  const results = [];
  try {
    for (const [k, width] of arguments_.widths.entries()) {
      results.push(
        await measure(browser, arguments_.url, width, {
          pointer: k === 0,
          lists: arguments_.lists,
        })
      );
    }
  } finally {
    await browser.close();
  }
  if (arguments_.json) {
    writeFileSync(
      arguments_.json,
      JSON.stringify(
        { url: arguments_.url, measured: new Date().toISOString(), results },
        null,
        2
      )
    );
  }
  console.log(report(arguments_.url, results));
}

/** Whether Node was started on this file, through a symlinked skill folder
 *  too (Node reports the main module by its real path). */
function isMain() {
  try {
    return realpathSync(process.argv[1]) === realpathSync(import.meta.filename);
  } catch {
    return false;
  }
}

if (process.argv[1] && isMain()) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
