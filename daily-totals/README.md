# BRC Daily Totals

A modern, interactive replacement for the three Trektellen "Daily Totals" embeds
on [batumiraptorcount.org/data](https://www.batumiraptorcount.org/data).

Built with **Vite + React + TypeScript + Tailwind v4 + shadcn/ui** (components are
copied into `src/components/ui`, so the dependency list stays small).

## What it does

- One clean **card per station** — Sakhalvasho (`1047`), Shuamta (`1048`),
  Kvirike (`5026`) — replacing the raw Trektellen HTML dump, each topped with the
  station's **banner photo** from the live BRC page.
- **BRC-themed**: the exact site green (`#4a9147`), the site's `aktiv-grotesk` /
  `aktiv-grotesk-condensed` type (resolved from the Typekit fonts already loaded
  on the Squarespace page when embedded), and matching corner radii. In local
  preview the condensed font falls back to Archivo Narrow / Arial Narrow.
- **Structured layout**: headline stats (individuals / species / count time),
  counting period, count type, weather, observers (as chips), a tidy species
  table with South/North direction columns, notable species highlighted, and
  field notes.
- An **elegant date picker** with:
  - **◀ / ▶ arrows** that step to the previous/next day that actually has a
    count (gaps are skipped, month boundaries are crossed automatically);
  - a **calendar** that marks every day **with a count** (green dot) and greys
    out days without one;
- A **"Lock dates"** toggle that syncs all three stations to the same day, so you
  can browse the whole site day-by-day in one go. When locked, the picker shows
  the union of available days across stations and shows a clear "No count on this
  date" state for any station that didn't count that day.

All data is fetched live from Trektellen (JSONP) and parsed client-side; there is
no build step or API key on Trektellen's side.

## Run it locally

```bash
cd daily-totals
npm install
npm run dev
```

Then open the printed URL (e.g. http://localhost:5173). It loads the **live**
Trektellen data, so you see exactly what will appear once embedded.

Other scripts:

```bash
npm run build     # produces a self-contained bundle in dist/
npm run preview   # serve the production build locally
```

## How it's structured

| Path | Purpose |
| --- | --- |
| `src/lib/trektellen.ts` | JSONP fetch + HTML → typed `CountData` parser |
| `src/lib/date.ts` | `YYYYMMDD` ⇄ `Date` helpers and formatting |
| `src/hooks/useTrektellen.ts` | All state: per-site data, availability cache, lock logic, prev/next stepping |
| `src/components/DateNavigator.tsx` | Arrows + calendar popover with availability |
| `src/components/CountSiteCard.tsx` | A single station card |
| `src/components/SpeciesTable.tsx` | The species table |
| `src/components/ui/*` | shadcn primitives (button, card, badge, calendar, popover, switch, …) |
| `src/App.tsx` | Header, lock toggle, the 3-card grid |

To change which stations are shown, edit the `SITES` array in
`src/hooks/useTrektellen.ts`.

## Embedding into Squarespace

The embeddable build is a **single self-contained JS file** that mounts the
widget inside a **Shadow DOM**, so it's fully isolated from the host page —
Squarespace's CSS can't break the widget, and the widget's CSS can't leak into
the page. The CSS is inlined into the JS, so there is only one file to load.

### 1. Build the bundle

```bash
cd daily-totals
npm run build:embed     # writes embed/brc-daily-totals.js
```

### 2. Publish it (so a CDN can serve it)

Commit the built file and push to GitHub, then tag a release so the CDN URL is
stable and permanently cached:

```bash
git add daily-totals && git commit -m "Build Daily Totals embed"
git tag daily-totals-v1 && git push origin main --tags
```

jsDelivr then serves it from the tag:

```
https://cdn.jsdelivr.net/gh/barthoekstra/brc-website-plugins@daily-totals-v1/daily-totals/embed/brc-daily-totals.js
```

### 3. Drop ONE code block on the Squarespace page

```html
<div id="brc-daily-totals"></div>
<script src="https://cdn.jsdelivr.net/gh/barthoekstra/brc-website-plugins@daily-totals-v1/daily-totals/embed/brc-daily-totals.js"></script>
```

That's it — the `<div>` is the mount point and the script does the rest.

### Updating later

Rebuild, commit, and bump the tag (`daily-totals-v2`, …) — then change the
version in the code block. (Using a tag instead of `@main` avoids jsDelivr's
up-to-7-day branch cache and means the embed never changes under you until you
choose to.)
