# Changelog format

The changelog lists the cards genuicn adds, one release per month. Each release is a Markdown file named `YYYY-MM.md`. A card goes into the month file when you decide it ships, not on every push, and a new month starts a new file. The parser in `lib/changelog/parse.ts` reads these files for `/changelog` and fails the build on anything outside this shape:

```md
---
month: 2026-11
new: /docs/quote
---

- [Quote](/docs/quote): A stock's price and change, with a trend line you can switch between 1D, 1W, 1M, and 1Y.
```

- **Frontmatter.** A `month` line that matches the file name, and an optional `new` line that lists the routes of the cards you just built, separated by commas.
- **Entries.** One bullet per new card, newest at the top, starting with `[Name](/docs/slug)`. A colon and one or two sentences follow, in plain text and inline code only, ending with a period.
- **What goes in.** Only cards that just shipped. Changes to existing cards and pages stay in the commit history.
- **The blue dot.** The cards in `new` get a blue dot in the sidebar and on the changelog. Every other card gets a grey dot. Only the newest month can have a `new` line, so take a card out of it once it is no longer new.
