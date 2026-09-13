# Landing and Pricing Pages — Design

**Date:** 2026-09-13
**Status:** Approved in chat, pending spec review
**Goal:** Give GrowthVoice OS two crawlable, prerendered pages — `/product` and `/pricing` — so AI crawlers that do not run JavaScript can read what the product is and what it costs. Raises the GEO score (33/100 after quick wins) without touching the voice console at `/`.

## Decisions (made with the user)

| Decision | Choice | Why |
|---|---|---|
| Where pages live | `/product` and `/pricing`; console stays at `/` | Hackathon links, README and pitch deck point at `/` |
| How pages are built | React components, prerendered to static HTML at build time | Same Tailwind look as the console; still crawlable |
| Routing | Vite multi-page build, **no router** | Two static pages do not need one; keeps them out of the console bundle |
| Price source | `packages/shared/plans.json`, imported by orchestrator and web | One source of truth; JSON avoids adding runtime TS exports to an ESM types-only package (ts-jest / Vercel / Docker risk) |
| Pricing CTA | Links to `/?plan=<id>`, which opens the existing Plans & ROI modal with that plan highlighted | Reuses the working Stripe Checkout flow; no second checkout path |
| Catalog file location | `packages/shared/plans.json` (package root) | The orchestrator compiles with Node10 module resolution, which ignores `exports` and needs the literal path to exist |

## Architecture

```
packages/shared/plans.json          ← single source: plans + cost per minute
      │                          │
      ▼                          ▼
apps/orchestrator/…/billingService.ts    apps/web/src/pages/{LandingPage,PricingPage}.tsx
(checkout, /api/billing/plans,                 │
 margin tests — unchanged behavior)            ├─ client: src/pages/product.tsx, pricing.tsx (hydrateRoot)
                                               └─ server: src/pages/entry-server.tsx (renderToString)
                                                         │
                               vite build (multi-page) ──┤
                               vite build --ssr ─────────┤
                               scripts/prerender.mjs ────┘→ dist/product/index.html
                                                           dist/pricing/index.html
```

### Units

| Unit | Does | Depends on |
|---|---|---|
| `packages/shared/plans.json` | `{ costPerVoiceMinuteUsd, plans: SubscriptionPlan[] }` — exact current values from `billingService.ts` | nothing |
| `packages/shared/package.json` | Adds `"./plans.json"` to `exports` | — |
| `billingService.ts` | `SUBSCRIPTION_PLANS` and `COST_PER_VOICE_MINUTE_USD` now read from the JSON; exports and behavior unchanged | `plans.json` |
| `apps/web/src/pages/LandingPage.tsx` | Pure presentational component, no browser APIs at render, no fetches | `plans.json` (lowest price only) |
| `apps/web/src/pages/PricingPage.tsx` | Pure presentational component; monthly/annual toggle is the only state, and **both** prices are always in the markup as text | `plans.json` |
| `apps/web/product/index.html`, `apps/web/pricing/index.html` | Vite entry HTML: own `<title>`, description, canonical, OG, JSON-LD, `<!--app-html-->` placeholder in `#root` | — |
| `apps/web/src/pages/product.tsx`, `pricing.tsx` | Client entries: `hydrateRoot` | page components, `index.css` |
| `apps/web/src/pages/entry-server.tsx` | `render(page: 'product' \| 'pricing'): string` via `renderToString` | page components |
| `apps/web/scripts/prerender.mjs` | Loads the SSR bundle, replaces `<!--app-html-->` in both dist HTML files. **Exits non-zero** if the placeholder is missing or render throws | SSR build output |

`App.tsx` and the console bundle import none of the new page code.

## Page content

Written from README facts only — no latency figures, no conversion claims, no testimonials (per CLAUDE.md honesty rules).

**`/product`**
1. Hero — H1 "A voice agent that qualifies your website visitors", one-sentence description, CTAs "Try the live demo" (`/`) and "See pricing" (`/pricing`).
2. What it does — the three README pillars (answers in voice; takes real actions mid-call; handles US disclosure and consent).
3. How it works — 4 steps (token → browser audio to AssemblyAI → tool call executes on server → result returns, lead lands in CRM).
4. US compliance — disclosure first, 13 all-party-consent states listed, strictest policy when location unknown, "not legal advice".
5. What is real today / not built yet — the README table.
6. FAQ — 5 self-contained Q&As (what it is, is recording visitors legal, how the embed works, what it costs, what data is stored). Also emitted as `FAQPage` JSON-LD with identical text.
7. Footer — links to `/pricing`, `/widget-preview`, GitHub.

**`/pricing`**
1. H1 "Pricing", one-line summary with the lowest monthly price.
2. Monthly/annual toggle (hydrated). Prerendered markup shows monthly as primary and "or $X/month billed annually" as text, so both are crawlable.
3. Three plan cards from `plans.json`: name, tagline, prices, included minutes, overage rate, features, CTA "Get started" → `/?plan=<id>`. Pro marked recommended.
4. Unit economics — $0.075/min voice cost, ~72% monthly / ~66% annual gross margin floor at full usage (sentence from README; the margin figure is backed by the existing test).
5. Pricing FAQ — 3 Q&As (overage, annual billing, test mode / no real charges yet).
6. JSON-LD: `SoftwareApplication` with one `Offer` per plan, prices generated from `plans.json` at build time.

Styling: existing Tailwind config and brand colors, dark ground, `max-w-6xl`, responsive grid collapsing to one column under `md`.

## Console change (`?plan=`)

- `App.tsx`: on mount, read `new URLSearchParams(window.location.search).get('plan')`; if it is `starter`, `pro` or `enterprise`, open the plans modal.
- `SubscriptionPlansModal.tsx`: new optional prop `highlightPlanId?: SubscriptionTierId`; that card gets the highlighted ring. Unknown or absent values do nothing.

## Build and deploy

- `vite.config.ts`: `build.rollupOptions.input` = `index.html`, `product/index.html`, `pricing/index.html`.
- `apps/web/package.json` build: `tsc || true && vite build && vite build --ssr src/pages/entry-server.tsx --outDir dist-ssr && node scripts/prerender.mjs`. (`tsc || true` is existing behavior; not changed here.)
- `dist-ssr/` added to `.gitignore`.
- `vercel.json`: no change expected — Vercel serves `dist/product/index.html` at `/product`. Verified after deploy; if it 404s, add explicit rewrites.
- `apps/web/public/sitemap.xml`: add `/product`, `/pricing`. `llms.txt`: link both. Console header and the `<noscript>` block in `apps/web/index.html`: link both.

## Error handling

- Prerender failure fails the build (non-zero exit) rather than shipping an empty page.
- Pages make no network calls at render, so there is nothing to fail at request time.
- If `plans.json` changes shape, TypeScript (`SubscriptionPlan[]` cast in one place per app) and the orchestrator margin tests catch it.

## Testing

- **Orchestrator (existing):** `billingService.test.ts` margin-floor tests still pass, now reading the JSON.
- **Web (new) `src/pages/pages.test.tsx`:**
  - `render('product')` contains the H1, all 13 consent-state codes, and each FAQ question.
  - `render('pricing')` contains every plan name, every `priceMonthlyUsd`, `priceAnnualMonthlyUsd` and overage rate from `plans.json`, and each CTA href `/?plan=<id>`.
- **Build check:** after `npm run build`, `dist/product/index.html` and `dist/pricing/index.html` contain rendered text (not an empty `#root`) and valid JSON-LD.
- **Post-deploy:** `curl` both URLs (no JS) and grep for prices/headings; re-run the GEO audit.

## Out of scope

Router, blog, `/about`, security headers, moving the console to `/app`, changing Stripe or ROI logic, fixing the sample-persona links.
