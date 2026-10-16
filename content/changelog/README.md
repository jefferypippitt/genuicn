# Changelog format

Each release gets one Markdown file named after its release day, `YYYY-MM-DD.md`. Add a new file for each push instead of editing an older one. The parser in `lib/changelog/parse.ts` reads these files for `/changelog`, and it fails the build on anything outside the shape below.

````md
---
released: 2026-11-04
title: Quote, Candlestick chart, and streaming fill-in for every card
---

One optional line that says what the release was about.

## New

- [Quote](/docs/quote): Price, change, and a trend line with a day to year switch. (#12)

## Breaking

- [Quote](/docs/quote): `symbol` is renamed `ticker`. (a1b2c3d)

  ```diff
  - <QuoteCard symbol="NVDA" />
  + <QuoteCard ticker="NVDA" />
  ```

## Updated

- **All cards**: Loading states hold their final height, so nothing jumps. (#14, 9f8e7d6)
````

- **Frontmatter.** The `released` day matches the file name. The `title` runs 90 characters at most and has no closing period.
- **Sections.** Only `## New`, `## Breaking`, and `## Updated` are allowed, in that order. Leave out a section that has no entries.
- **Kinds.** New is a card or page that just landed. The changelog page lists the newest release's New entries at the top, and the sidebar puts a blue dot on each page they link to, so list a card under New only in the release that ships it. Updated is a change to something that already exists. Breaking means readers have to change their code, so the entry carries one ` ```diff ` block that shows the call site before and after.
- **Entries.** An entry starts with `[Name](/route)` when it has a page, or `**Name**` when it spans several pages. A colon and one or two sentences follow, in plain text and inline code only. The entry ends with up to 3 refs in parentheses, `#12` for a PR or a 7-character SHA for a commit. Leave the refs out for work that isn't committed yet.
