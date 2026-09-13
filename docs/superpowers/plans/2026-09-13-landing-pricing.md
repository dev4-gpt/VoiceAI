# Landing and Pricing Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship prerendered, crawlable `/product` and `/pricing` pages for GrowthVoice OS, with prices from one shared JSON catalog.

**Architecture:** The plan catalog moves to `packages/shared/plans.json`, read by the orchestrator (checkout, `/api/billing/plans`, margin tests) and by two new React page components. Vite builds the pages as extra HTML entries; an SSR build plus `scripts/prerender.mjs` writes their HTML into `dist/` so crawlers get content without JavaScript. The console at `/` is untouched apart from a `?plan=` deep link into its existing plans modal.

**Tech Stack:** React 18.3.1, Vite 5.4, Tailwind 3.4, TypeScript 5.4, Vitest 1.6 + Testing Library (web), Jest 30 + ts-jest (orchestrator), Node 20, Vercel.

**Spec:** `docs/superpowers/specs/2026-09-13-landing-pricing-design.md`

## Global Constraints

- The voice console stays at `/`; no router is added; `App.tsx` must not import any page component.
- Prices, minutes and overage rates come only from `packages/shared/plans.json` — never retyped in page code.
- No latency figures, conversion rates, testimonials or unverified metrics in any copy (CLAUDE.md honesty rules). Copy is drawn from README facts.
- No new npm dependencies.
- Files stay under 500 lines.
- Prerender failure must fail the build (non-zero exit).
- Commit messages: conventional style, no `Co-Authored-By` trailer.
- Run commands from the repo root `/Users/aryamandev/Developer/VoiceAI` unless a step says otherwise.
- `packages/shared/plans.json` sits at the **package root**, not `src/`: the orchestrator compiles with `moduleResolution: node` (Node10), which ignores `exports` and resolves `@voice-os/shared/plans.json` as a literal file path.

## File Map

| File | Action | Responsibility |
|---|---|---|
| `packages/shared/plans.json` | Create | Plan catalog + voice cost per minute |
| `packages/shared/package.json` | Modify | Export `./plans.json` |
| `apps/orchestrator/src/services/billingService.ts` | Modify | Read catalog from JSON |
| `apps/orchestrator/src/__tests__/billingService.test.ts` | Modify | Assert catalog source |
| `apps/web/src/pages/plans.ts` | Create | Typed catalog + formatters + site URL for web |
| `apps/web/src/pages/SiteChrome.tsx` | Create | Header, footer, FAQ list, `FaqItem` type |
| `apps/web/src/pages/PricingPage.tsx` | Create | `/pricing` component + `PRICING_FAQ` |
| `apps/web/src/pages/PricingPage.test.tsx` | Create | Pricing render test |
| `apps/web/src/pages/LandingPage.tsx` | Create | `/product` component + `PRODUCT_FAQ`, `CONSENT_STATES` |
| `apps/web/src/pages/LandingPage.test.tsx` | Create | Landing render test |
| `apps/web/src/pages/entry-server.tsx` | Create | `render`, `renderHead`, `structuredData` |
| `apps/web/src/pages/entry-server.test.tsx` | Create | Prerender + JSON-LD tests |
| `apps/web/src/pages/product.tsx`, `pricing.tsx` | Create | Client hydration entries |
| `apps/web/product/index.html`, `apps/web/pricing/index.html` | Create | HTML entries with placeholders |
| `apps/web/scripts/prerender.mjs` | Create | Inject rendered HTML into `dist` |
| `apps/web/vite.config.ts`, `apps/web/package.json`, `apps/web/tailwind.config.js`, `.gitignore` | Modify | Multi-page + SSR build wiring |
| `apps/web/src/utils/planParam.ts` (+ test) | Create | Parse `?plan=` |
| `apps/web/src/components/SubscriptionPlansModal.tsx` (+ test) | Modify/Create | `highlightPlanId` prop |
| `apps/web/src/App.tsx` | Modify | Open modal from `?plan=`, header links |
| `apps/web/public/sitemap.xml`, `apps/web/public/llms.txt`, `apps/web/index.html` | Modify | Link new pages |

---

### Task 1: Shared plan catalog read by the orchestrator

**Files:**
- Create: `packages/shared/plans.json`
- Modify: `packages/shared/package.json` (`exports`)
- Modify: `apps/orchestrator/src/services/billingService.ts:8` (imports) and `:26-89` (constants)
- Test: `apps/orchestrator/src/__tests__/billingService.test.ts`
- Modify: `docs/superpowers/specs/2026-09-13-landing-pricing-design.md` (path correction)

**Interfaces:**
- Produces: JSON module `@voice-os/shared/plans.json` with shape `{ costPerVoiceMinuteUsd: number; plans: SubscriptionPlan[] }`. `SUBSCRIPTION_PLANS` and `COST_PER_VOICE_MINUTE_USD` keep their existing names and types.

- [ ] **Step 1: Write the failing test**

Add to the top imports of `apps/orchestrator/src/__tests__/billingService.test.ts`:

```ts
import catalog from '@voice-os/shared/plans.json';
```

Append at the end of the file:

```ts
describe('plan catalog source', () => {
  it('reads plans and voice cost from the shared catalog', () => {
    expect(SUBSCRIPTION_PLANS).toEqual(catalog.plans);
    expect(COST_PER_VOICE_MINUTE_USD).toBe(catalog.costPerVoiceMinuteUsd);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace apps/orchestrator -- billingService`
Expected: FAIL — `Cannot find module '@voice-os/shared/plans.json'`.

- [ ] **Step 3: Create the catalog**

Create `packages/shared/plans.json` with exactly the current values:

```json
{
  "costPerVoiceMinuteUsd": 0.075,
  "plans": [
    {
      "id": "starter",
      "name": "Starter",
      "tagline": "One voice agent answering your website around the clock",
      "priceMonthlyUsd": 149,
      "priceAnnualMonthlyUsd": 119,
      "voiceMinutesMonthly": 500,
      "overageRatePerMinUsd": 0.3,
      "maxAutonomousAgents": 1,
      "features": [
        "1 voice agent persona",
        "500 voice minutes / month, then $0.30/min",
        "Live lead capture and BANT qualification into your CRM",
        "Consultation requests recorded on each lead",
        "US AI-disclosure and recording-consent layer",
        "Embeddable website voice widget"
      ]
    },
    {
      "id": "pro",
      "name": "Pro",
      "tagline": "Voice qualification plus the content pipeline and CRM tooling",
      "priceMonthlyUsd": 449,
      "priceAnnualMonthlyUsd": 359,
      "voiceMinutesMonthly": 1500,
      "overageRatePerMinUsd": 0.25,
      "maxAutonomousAgents": 3,
      "recommended": true,
      "features": [
        "Everything in Starter",
        "3 configurable agent personas (e.g. inbound SDR, churn rescue)",
        "1,500 voice minutes / month, then $0.25/min",
        "Content pipeline: conversations into X, LinkedIn and Substack drafts",
        "Publishes live once you connect your accounts",
        "Encrypted storage for your platform credentials",
        "Obsidian vault export of leads and dossiers"
      ]
    },
    {
      "id": "enterprise",
      "name": "Enterprise",
      "tagline": "For agencies running voice for several brands",
      "priceMonthlyUsd": 1497,
      "priceAnnualMonthlyUsd": 1197,
      "voiceMinutesMonthly": 5000,
      "overageRatePerMinUsd": 0.2,
      "maxAutonomousAgents": 999,
      "features": [
        "Everything in Pro",
        "Unlimited agent personas",
        "5,000 voice minutes / month, then $0.20/min",
        "Separate credentials and vault exports per client brand",
        "Enforced discount ceilings on retention offers",
        "Priority onboarding"
      ]
    }
  ]
}
```

In `packages/shared/package.json`, replace:

```json
  "exports": {
    ".": "./src/types.ts"
  },
```

with:

```json
  "exports": {
    ".": "./src/types.ts",
    "./plans.json": "./plans.json"
  },
```

- [ ] **Step 4: Point billingService at the catalog**

In `apps/orchestrator/src/services/billingService.ts`, directly after the line `} from '@voice-os/shared';` (line 8), add:

```ts
import catalog from '@voice-os/shared/plans.json';
```

Replace everything from `export const COST_PER_VOICE_MINUTE_USD = 0.075;` through the closing `];` of `SUBSCRIPTION_PLANS` (the line before `export class BillingService`) with:

```ts
export const COST_PER_VOICE_MINUTE_USD: number = catalog.costPerVoiceMinuteUsd;

/**
 * The catalog lives in packages/shared/plans.json so the prerendered /pricing
 * page shows exactly what checkout charges and what the margin tests check.
 */
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = catalog.plans as SubscriptionPlan[];
```

Leave the doc comment above it (lines 10-25) unchanged.

- [ ] **Step 5: Run tests, typecheck and runtime resolution**

Run: `npm test --workspace apps/orchestrator`
Expected: PASS — 64 tests (63 existing + 1 new).

Run: `cd apps/orchestrator && npx tsc --noEmit; echo "exit $?"; cd ../..`
Expected: `exit 0`, no errors.

Run: `cd apps/orchestrator && node -e "console.log(require('@voice-os/shared/plans.json').plans.length)"; cd ../..`
Expected: `3` (proves Node honors the new `exports` entry at runtime).

- [ ] **Step 6: Correct the spec path**

In `docs/superpowers/specs/2026-09-13-landing-pricing-design.md`, replace every `packages/shared/src/plans.json` with `packages/shared/plans.json`, and add this row to the Decisions table:

```markdown
| Catalog file location | `packages/shared/plans.json` (package root) | The orchestrator compiles with Node10 module resolution, which ignores `exports` and needs the literal path to exist |
```

- [ ] **Step 7: Commit**

```bash
git add packages/shared/plans.json packages/shared/package.json apps/orchestrator/src/services/billingService.ts apps/orchestrator/src/__tests__/billingService.test.ts docs/superpowers/specs/2026-09-13-landing-pricing-design.md
git commit -m "refactor(billing): move plan catalog to shared plans.json"
```

---

### Task 2: Pricing page component

**Files:**
- Create: `apps/web/src/pages/plans.ts`
- Create: `apps/web/src/pages/SiteChrome.tsx`
- Create: `apps/web/src/pages/PricingPage.tsx`
- Test: `apps/web/src/pages/PricingPage.test.tsx`

**Interfaces:**
- Consumes: `@voice-os/shared/plans.json` (Task 1).
- Produces:
  - `plans.ts`: `PLANS: SubscriptionPlan[]`, `COST_PER_VOICE_MINUTE_USD: number`, `usd(n: number): string` (e.g. `$1,497`), `perMinute(n: number): string` (e.g. `$0.30/min`), `SITE_URL = 'https://growthvoice-os.vercel.app'`.
  - `SiteChrome.tsx`: `interface FaqItem { question: string; answer: string }`, `SiteHeader: React.FC`, `SiteFooter: React.FC`, `FaqList: React.FC<{ items: FaqItem[] }>`.
  - `PricingPage.tsx`: `PricingPage: React.FC`, `PRICING_FAQ: FaqItem[]`.

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/pages/PricingPage.test.tsx`:

```tsx
import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { PricingPage, PRICING_FAQ } from './PricingPage';
import { PLANS, usd, perMinute } from './plans';

describe('PricingPage', () => {
  const html = renderToString(<PricingPage />);

  it('has a Pricing heading', () => {
    expect(html).toMatch(/<h1[^>]*>Pricing<\/h1>/);
  });

  it.each(PLANS.map((p) => [p.id, p]))('shows every catalog figure for %s', (_id, plan) => {
    expect(html).toContain(plan.name);
    expect(html).toContain(usd(plan.priceMonthlyUsd));
    expect(html).toContain(usd(plan.priceAnnualMonthlyUsd));
    expect(html).toContain(perMinute(plan.overageRatePerMinUsd));
    expect(html).toContain(`href="/?plan=${plan.id}"`);
  });

  it('renders each pricing FAQ question', () => {
    for (const item of PRICING_FAQ) {
      expect(html).toContain(item.question);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace apps/web -- PricingPage`
Expected: FAIL — `Failed to resolve import "./PricingPage"`.

- [ ] **Step 3: Create `plans.ts`**

```ts
import catalog from '@voice-os/shared/plans.json';
import type { SubscriptionPlan } from '@voice-os/shared';

/** Same catalog the orchestrator charges from; see packages/shared/plans.json. */
export const PLANS = catalog.plans as SubscriptionPlan[];
export const COST_PER_VOICE_MINUTE_USD: number = catalog.costPerVoiceMinuteUsd;

export const SITE_URL = 'https://growthvoice-os.vercel.app';

export const usd = (n: number) => `$${n.toLocaleString('en-US')}`;
export const perMinute = (n: number) => `$${n.toFixed(2)}/min`;
```

- [ ] **Step 4: Create `SiteChrome.tsx`**

```tsx
import React from 'react';

export interface FaqItem {
  question: string;
  answer: string;
}

export const SiteHeader: React.FC = () => (
  <header className="border-b border-white/10">
    <nav aria-label="Main" className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
      <a href="/product" className="font-bold tracking-tight text-white">
        GrowthVoice OS
      </a>
      <div className="flex items-center gap-5 text-sm">
        <a href="/product" className="text-slate-300 hover:text-white">
          Product
        </a>
        <a href="/pricing" className="text-slate-300 hover:text-white">
          Pricing
        </a>
        <a href="/" className="rounded-lg bg-cyan-500 px-3 py-1.5 font-semibold text-slate-950 hover:bg-cyan-400">
          Try the live demo
        </a>
      </div>
    </nav>
  </header>
);

export const SiteFooter: React.FC = () => (
  <footer className="mt-24 border-t border-white/10">
    <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-8 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between">
      <p>GrowthVoice OS — built on the AssemblyAI Voice Agent API. MIT licensed.</p>
      <nav aria-label="Footer" className="flex flex-wrap gap-5">
        <a href="/product" className="hover:text-white">Product</a>
        <a href="/pricing" className="hover:text-white">Pricing</a>
        <a href="/widget-preview" className="hover:text-white">Widget demo</a>
        <a href="https://github.com/dev4-gpt/VoiceAI" className="hover:text-white">Source code</a>
      </nav>
    </div>
  </footer>
);

export const FaqList: React.FC<{ items: FaqItem[] }> = ({ items }) => (
  <div className="mt-8 space-y-4">
    {items.map((item) => (
      <div key={item.question} className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
        <h3 className="text-base font-semibold text-white">{item.question}</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">{item.answer}</p>
      </div>
    ))}
  </div>
);
```

- [ ] **Step 5: Create `PricingPage.tsx`**

```tsx
import React, { useState } from 'react';
import { PLANS, COST_PER_VOICE_MINUTE_USD, usd, perMinute } from './plans';
import { SiteHeader, SiteFooter, FaqList, type FaqItem } from './SiteChrome';

type Cycle = 'monthly' | 'annual';

const recommended = PLANS.find((p) => p.recommended) ?? PLANS[0];
const annualSavingPct = Math.round((1 - recommended.priceAnnualMonthlyUsd / recommended.priceMonthlyUsd) * 100);
const lowestMonthly = Math.min(...PLANS.map((p) => p.priceMonthlyUsd));

export const PRICING_FAQ: FaqItem[] = [
  {
    question: 'What happens if I use more voice minutes than my plan includes?',
    answer: `Calls keep working. Minutes beyond your plan's allowance are billed at its overage rate: ${PLANS.map(
      (p) => `${perMinute(p.overageRatePerMinUsd)} on ${p.name}`
    ).join(', ')}. Every overage rate is above the ${perMinute(COST_PER_VOICE_MINUTE_USD)} the voice API costs, so extra minutes never sell below cost.`
  },
  {
    question: 'How much does annual billing save?',
    answer: `Paying yearly lowers the monthly rate by about ${annualSavingPct}%: ${PLANS.map(
      (p) => `${p.name} is ${usd(p.priceAnnualMonthlyUsd)} a month instead of ${usd(p.priceMonthlyUsd)}`
    ).join('; ')}.`
  },
  {
    question: 'Can I pay for a plan today?',
    answer:
      'Checkout runs on Stripe in test mode during the hackathon release, so no real card is charged. You can try the full flow with the test card 4242 4242 4242 4242. A plan only activates after Stripe confirms payment through a signature-verified webhook.'
  }
];

export const PricingPage: React.FC = () => {
  const [cycle, setCycle] = useState<Cycle>('monthly');

  return (
    <div className="min-h-screen text-slate-100">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 py-16">
        <section className="mx-auto max-w-2xl text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">Pricing</h1>
          <p className="mt-4 text-lg text-slate-300">
            Plans start at {usd(lowestMonthly)} a month for a voice agent that answers your website around the clock and
            writes every qualified lead into your CRM.
          </p>
          <div role="group" aria-label="Billing cycle" className="mt-8 inline-flex rounded-xl border border-white/10 p-1">
            {(['monthly', 'annual'] as const).map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={cycle === c}
                onClick={() => setCycle(c)}
                className={`rounded-lg px-4 py-1.5 text-sm font-semibold ${
                  cycle === c ? 'bg-white text-slate-950' : 'text-slate-300 hover:text-white'
                }`}
              >
                {c === 'monthly' ? 'Monthly' : `Annual (save ${annualSavingPct}%)`}
              </button>
            ))}
          </div>
        </section>

        <section aria-label="Plans" className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {PLANS.map((plan) => {
            const primary = cycle === 'annual' ? plan.priceAnnualMonthlyUsd : plan.priceMonthlyUsd;
            const secondary =
              cycle === 'annual'
                ? `or ${usd(plan.priceMonthlyUsd)}/month billed monthly`
                : `or ${usd(plan.priceAnnualMonthlyUsd)}/month billed annually`;
            return (
              <article
                key={plan.id}
                className={`flex flex-col rounded-2xl p-6 ${
                  plan.recommended ? 'border-2 border-amber-400/60 bg-amber-500/[0.06]' : 'border border-white/10 bg-white/[0.02]'
                }`}
              >
                <h2 className="text-lg font-bold text-white">
                  {plan.name}
                  {plan.recommended && (
                    <span className="ml-2 rounded-full bg-amber-400 px-2 py-0.5 align-middle text-[10px] font-extrabold text-slate-950">
                      RECOMMENDED
                    </span>
                  )}
                </h2>
                <p className="mt-1 text-sm text-slate-400">{plan.tagline}</p>
                <p className="mt-5">
                  <span className="text-4xl font-extrabold text-white">{usd(primary)}</span>
                  <span className="text-sm text-slate-400">/month</span>
                </p>
                <p className="text-xs text-slate-400">{secondary}</p>
                <p className="mt-4 text-sm text-slate-300">
                  {`${plan.voiceMinutesMonthly.toLocaleString('en-US')} voice minutes included, then ${perMinute(plan.overageRatePerMinUsd)}`}
                </p>
                <ul className="mt-5 flex-1 space-y-2 text-sm text-slate-300">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <span aria-hidden="true" className="text-amber-400">✓</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href={`/?plan=${plan.id}`}
                  className={`mt-6 block rounded-xl px-4 py-2.5 text-center text-sm font-bold ${
                    plan.recommended
                      ? 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                      : 'border border-white/10 bg-white/5 text-slate-100 hover:bg-white/10'
                  }`}
                >
                  {`Get started with ${plan.name}`}
                </a>
              </article>
            );
          })}
        </section>

        <section className="mx-auto mt-20 max-w-3xl">
          <h2 className="text-2xl font-bold text-white">What a voice minute costs</h2>
          <p className="mt-4 leading-relaxed text-slate-300">
            {`Conversations run on the AssemblyAI Voice Agent API, which costs ${perMinute(COST_PER_VOICE_MINUTE_USD)} all-in. After Stripe's fees, every plan keeps about 72% gross margin on monthly billing (66% on annual) even if every included minute is used, and a test in the codebase fails if a price change breaks that floor. Typical usage is lower, so real margins run higher.`}
          </p>
        </section>

        <section className="mx-auto mt-20 max-w-3xl">
          <h2 className="text-2xl font-bold text-white">Pricing questions</h2>
          <FaqList items={PRICING_FAQ} />
        </section>
      </main>
      <SiteFooter />
    </div>
  );
};
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test --workspace apps/web -- PricingPage`
Expected: PASS — 5 tests (1 heading + 3 plans + 1 FAQ).

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/pages/plans.ts apps/web/src/pages/SiteChrome.tsx apps/web/src/pages/PricingPage.tsx apps/web/src/pages/PricingPage.test.tsx
git commit -m "feat(web): pricing page component driven by the shared plan catalog"
```

---

### Task 3: Landing page component

**Files:**
- Create: `apps/web/src/pages/LandingPage.tsx`
- Test: `apps/web/src/pages/LandingPage.test.tsx`

**Interfaces:**
- Consumes: `PLANS`, `usd`, `perMinute` from `./plans`; `SiteHeader`, `SiteFooter`, `FaqList`, `FaqItem` from `./SiteChrome` (Task 2).
- Produces: `LandingPage: React.FC`, `PRODUCT_FAQ: FaqItem[]`, `CONSENT_STATES: string[]`, `LANDING_H1 = 'A voice agent that qualifies your website visitors'`.

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/pages/LandingPage.test.tsx`:

```tsx
import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { LandingPage, PRODUCT_FAQ, CONSENT_STATES, LANDING_H1 } from './LandingPage';

describe('LandingPage', () => {
  const html = renderToString(<LandingPage />);

  it('has the landing H1', () => {
    expect(html).toMatch(new RegExp(`<h1[^>]*>${LANDING_H1}</h1>`));
  });

  it('lists all 13 all-party-consent states', () => {
    expect(CONSENT_STATES).toHaveLength(13);
    for (const code of CONSENT_STATES) {
      expect(html).toContain(`>${code}<`);
    }
  });

  it('renders each FAQ question', () => {
    expect(PRODUCT_FAQ).toHaveLength(5);
    for (const item of PRODUCT_FAQ) {
      expect(html).toContain(item.question);
    }
  });

  it('links to the demo and pricing', () => {
    expect(html).toContain('href="/"');
    expect(html).toContain('href="/pricing"');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace apps/web -- LandingPage`
Expected: FAIL — `Failed to resolve import "./LandingPage"`.

- [ ] **Step 3: Create `LandingPage.tsx`**

```tsx
import React from 'react';
import { PLANS, usd, perMinute } from './plans';
import { SiteHeader, SiteFooter, FaqList, type FaqItem } from './SiteChrome';

export const LANDING_H1 = 'A voice agent that qualifies your website visitors';

/** The 13 US all-party-consent states the compliance layer asks permission in (README, "US compliance layer"). */
export const CONSENT_STATES = ['CA', 'CT', 'DE', 'FL', 'IL', 'MD', 'MA', 'MI', 'MT', 'NV', 'NH', 'PA', 'WA'];

const cheapest = PLANS.reduce((a, b) => (b.priceMonthlyUsd < a.priceMonthlyUsd ? b : a));
const recommended = PLANS.find((p) => p.recommended) ?? PLANS[0];
const annualSavingPct = Math.round((1 - recommended.priceAnnualMonthlyUsd / recommended.priceMonthlyUsd) * 100);

export const PRODUCT_FAQ: FaqItem[] = [
  {
    question: 'What is GrowthVoice OS?',
    answer:
      'GrowthVoice OS is a browser voice agent for B2B websites. A visitor clicks, speaks, and is answered in real time, with no phone number and no download. While it talks, the agent calls tools that create the lead, record budget, authority, need and timeline, and capture a consultation request in a Postgres-backed CRM, so the lead exists before the call ends. It runs on the AssemblyAI Voice Agent API and embeds on any site with one script tag.'
  },
  {
    question: 'Is it legal to have an AI voice agent talk to my website visitors?',
    answer: `Two US rules matter most. Some states require telling people they are talking to an AI, so GrowthVoice OS adds that disclosure to the start of every greeting on the server, where a client cannot skip it. ${CONSENT_STATES.length} states require every party to consent before a conversation is recorded, and real-time transcription can count as recording. In those states, and whenever the visitor's location is unknown, the agent asks permission before it listens and stores a record of that consent. This is an engineering implementation of published statutes, not legal advice; have counsel review the disclosure wording before using it with customers.`
  },
  {
    question: 'How do I add the voice agent to my website?',
    answer:
      'Paste one script tag into your site: the embed.js snippet with your company name. It adds a "Talk to Anna" button. When a visitor clicks it, the browser asks for microphone access, fetches a short-lived token from the GrowthVoice OS server, and streams audio directly to AssemblyAI. Your API key never reaches the browser, and you can restrict which domains are allowed to load the widget.'
  },
  {
    question: 'How much does GrowthVoice OS cost?',
    answer: `Plans start at ${usd(cheapest.priceMonthlyUsd)} a month. ${PLANS.map(
      (p) => `${p.name} is ${usd(p.priceMonthlyUsd)} a month with ${p.voiceMinutesMonthly.toLocaleString('en-US')} voice minutes, then ${perMinute(p.overageRatePerMinUsd)}`
    ).join('. ')}. Paying annually lowers each rate by about ${annualSavingPct}%. Full details are on the pricing page.`
  },
  {
    question: 'What data does GrowthVoice OS store?',
    answer:
      'For each conversation it stores the lead the agent creates, including company, what the visitor is looking for, and their budget, authority, need and timeline answers, plus consent records showing the region, the rule applied, the disclosure text and timestamps. Audio goes straight from the visitor’s browser to AssemblyAI and never passes through GrowthVoice OS servers. Third-party credentials you connect are encrypted with AES-256-GCM before they are stored.'
  }
];

const PILLARS = [
  {
    title: 'Answers in voice, in the browser',
    body: 'A visitor clicks, speaks, and is heard. There is no phone number to dial and nothing to download.'
  },
  {
    title: 'Takes real actions mid-conversation',
    body: 'The agent calls tools while it talks: it creates the lead, records budget, authority, need and timeline, and captures a consultation request. Each result lands in the CRM while the call is still going.'
  },
  {
    title: 'Handles US disclosure and consent first',
    body: 'It tells the visitor they are talking to an AI before anything else, and in all-party-consent states it asks permission before transcribing, then keeps an audit record of that consent.'
  }
];

const STEPS = [
  {
    title: 'A short-lived token is issued',
    body: 'The GrowthVoice OS server requests a temporary AssemblyAI token. The API key never reaches the browser.'
  },
  {
    title: 'Audio streams straight to AssemblyAI',
    body: 'The browser captures 24 kHz mono audio and streams it over a WebSocket to the AssemblyAI Voice Agent API.'
  },
  {
    title: 'The agent calls tools as it talks',
    body: 'Seven tools are registered with the agent, including create_or_update_lead, qualify_lead and schedule_growth_consultation. Each call runs on the server.'
  },
  {
    title: 'Results return mid-conversation',
    body: 'The tool result goes back to the agent so it keeps talking with real data, and the lead appears in the CRM before the call ends.'
  }
];

const REAL_TODAY = [
  'Browser voice calls on the AssemblyAI Voice Agent API',
  'Tool calls that create and qualify CRM leads',
  'Embeddable widget running real voice sessions',
  'AI disclosure and consent gating, with persisted records',
  'Postgres persistence and encrypted credentials',
  'Stripe Checkout with webhook-driven activation (test mode)'
];

const NOT_YET = [
  'Multi-tenant login and accounts',
  'Usage metering from live calls',
  'Calendar integration (bookings are recorded on the lead)',
  'Measured latency (no latency figures are claimed)',
  'Embedding-based retrieval (knowledge lookup is keyword-based)'
];

export const LandingPage: React.FC = () => (
  <div className="min-h-screen text-slate-100">
    <SiteHeader />
    <main className="mx-auto max-w-6xl px-6">
      <section className="mx-auto max-w-3xl py-20 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">{LANDING_H1}</h1>
        <p className="mt-6 text-lg leading-relaxed text-slate-300">
          GrowthVoice OS answers your website around the clock, qualifies the visitor out loud, and writes the lead into
          your CRM while the call is still going, with US AI-disclosure and recording-consent rules built in.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <a href="/" className="rounded-xl bg-cyan-500 px-5 py-3 font-semibold text-slate-950 hover:bg-cyan-400">
            Try the live demo
          </a>
          <a href="/pricing" className="rounded-xl border border-white/15 px-5 py-3 font-semibold text-white hover:bg-white/5">
            See pricing
          </a>
        </div>
      </section>

      <section aria-labelledby="what-it-does" className="py-12">
        <h2 id="what-it-does" className="text-2xl font-bold text-white">What it does</h2>
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          {PILLARS.map((p) => (
            <div key={p.title} className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
              <h3 className="font-semibold text-white">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="how-it-works" className="py-12">
        <h2 id="how-it-works" className="text-2xl font-bold text-white">How it works</h2>
        <ol className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          {STEPS.map((s, i) => (
            <li key={s.title} className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
              <p className="font-mono text-xs text-cyan-400">{`Step ${i + 1}`}</p>
              <h3 className="mt-1 font-semibold text-white">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="compliance" className="py-12">
        <h2 id="compliance" className="text-2xl font-bold text-white">US compliance layer</h2>
        <p className="mt-4 max-w-3xl leading-relaxed text-slate-300">
          The AI disclosure is added to the greeting on the server, so no session can start without it. In the
          all-party-consent states below, the agent asks for explicit opt-in before transcribing. When the visitor’s
          location is unknown, the strictest policy applies. Consent records are append-only and saved before the call
          starts. This is an engineering implementation of published statutes, not legal advice.
        </p>
        <ul aria-label="All-party-consent states" className="mt-6 flex flex-wrap gap-2">
          {CONSENT_STATES.map((code) => (
            <li key={code} className="rounded-md border border-white/10 px-2.5 py-1 font-mono text-xs text-slate-200">{code}</li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="real-today" className="py-12">
        <h2 id="real-today" className="text-2xl font-bold text-white">What is real today</h2>
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.04] p-6">
            <h3 className="font-semibold text-emerald-300">Working now</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-300">
              {REAL_TODAY.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <h3 className="font-semibold text-slate-200">Not built yet</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-400">
              {NOT_YET.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        </div>
      </section>

      <section aria-labelledby="faq" className="py-12">
        <h2 id="faq" className="text-2xl font-bold text-white">Frequently asked questions</h2>
        <FaqList items={PRODUCT_FAQ} />
      </section>
    </main>
    <SiteFooter />
  </div>
);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test --workspace apps/web -- LandingPage`
Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/LandingPage.tsx apps/web/src/pages/LandingPage.test.tsx
git commit -m "feat(web): landing page component with FAQ and compliance content"
```

---

### Task 4: Prerender pipeline (entries, SSR render, build wiring)

**Files:**
- Create: `apps/web/src/pages/entry-server.tsx`
- Test: `apps/web/src/pages/entry-server.test.tsx`
- Create: `apps/web/src/pages/product.tsx`, `apps/web/src/pages/pricing.tsx`
- Create: `apps/web/product/index.html`, `apps/web/pricing/index.html`
- Create: `apps/web/scripts/prerender.mjs`
- Modify: `apps/web/vite.config.ts`, `apps/web/package.json` (`build` script), `apps/web/tailwind.config.js` (`content`), `.gitignore`

**Interfaces:**
- Consumes: `LandingPage`, `PRODUCT_FAQ`, `LANDING_H1` (Task 3); `PricingPage`, `PRICING_FAQ` (Task 2); `PLANS`, `SITE_URL`, `usd`, `perMinute` (Task 2); `FaqItem` (Task 2).
- Produces: `type PageId = 'product' | 'pricing'`; `render(page: PageId): string`; `structuredData(page: PageId): Record<string, unknown>`; `renderHead(page: PageId): string` (a single `<script type="application/ld+json">` tag with `<` escaped). Build output `apps/web/dist-ssr/entry-server.js`. HTML placeholders `<!--app-head-->` and `<!--app-html-->`.

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/pages/entry-server.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, renderHead } from './entry-server';
import { PLANS } from './plans';
import { PRODUCT_FAQ, LANDING_H1 } from './LandingPage';

const parseHead = (head: string) =>
  JSON.parse(head.replace(/^<script type="application\/ld\+json">/, '').replace(/<\/script>$/, ''));

describe('prerender entry', () => {
  it('renders the product page', () => {
    expect(render('product')).toContain(LANDING_H1);
  });

  it('renders the pricing page', () => {
    expect(render('pricing')).toMatch(/<h1[^>]*>Pricing<\/h1>/);
  });

  it('emits one Offer per plan at the catalog monthly price', () => {
    const graph = parseHead(renderHead('pricing'))['@graph'] as Array<Record<string, any>>;
    const app = graph.find((n) => n['@type'] === 'SoftwareApplication')!;
    expect(app.offers.map((o: { price: string }) => o.price)).toEqual(PLANS.map((p) => String(p.priceMonthlyUsd)));
  });

  it('emits FAQPage JSON-LD matching the visible product FAQ', () => {
    const graph = parseHead(renderHead('product'))['@graph'] as Array<Record<string, any>>;
    const faq = graph.find((n) => n['@type'] === 'FAQPage')!;
    expect(faq.mainEntity.map((q: { name: string }) => q.name)).toEqual(PRODUCT_FAQ.map((f) => f.question));
  });

  it('escapes < so content cannot close the script tag', () => {
    for (const page of ['product', 'pricing'] as const) {
      expect(renderHead(page)).not.toMatch(/<(?!\/?script)/);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace apps/web -- entry-server`
Expected: FAIL — `Failed to resolve import "./entry-server"`.

- [ ] **Step 3: Create `entry-server.tsx`**

```tsx
import React from 'react';
import { renderToString } from 'react-dom/server';
import { LandingPage, PRODUCT_FAQ } from './LandingPage';
import { PricingPage, PRICING_FAQ } from './PricingPage';
import { PLANS, SITE_URL, usd, perMinute } from './plans';
import type { FaqItem } from './SiteChrome';

export type PageId = 'product' | 'pricing';

export function render(page: PageId): string {
  return renderToString(page === 'product' ? <LandingPage /> : <PricingPage />);
}

const faqPage = (items: FaqItem[]) => ({
  '@type': 'FAQPage',
  mainEntity: items.map((item) => ({
    '@type': 'Question',
    name: item.question,
    acceptedAnswer: { '@type': 'Answer', text: item.answer }
  }))
});

export function structuredData(page: PageId): Record<string, unknown> {
  if (page === 'product') {
    return { '@context': 'https://schema.org', '@graph': [faqPage(PRODUCT_FAQ)] };
  }
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        name: 'GrowthVoice OS',
        url: `${SITE_URL}/pricing`,
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        offers: PLANS.map((plan) => ({
          '@type': 'Offer',
          name: plan.name,
          price: String(plan.priceMonthlyUsd),
          priceCurrency: 'USD',
          description: `${plan.voiceMinutesMonthly.toLocaleString('en-US')} voice minutes per month, then ${perMinute(plan.overageRatePerMinUsd)}; ${usd(plan.priceAnnualMonthlyUsd)}/month billed annually`
        }))
      },
      faqPage(PRICING_FAQ)
    ]
  };
}

/** JSON-LD for the page head. `<` is escaped so no string in the data can close the script tag. */
export function renderHead(page: PageId): string {
  const json = JSON.stringify(structuredData(page)).replace(/</g, '\\u003c');
  return `<script type="application/ld+json">${json}</script>`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test --workspace apps/web -- entry-server`
Expected: PASS — 5 tests.

- [ ] **Step 5: Create client entries**

`apps/web/src/pages/product.tsx`:

```tsx
import React from 'react';
import { hydrateRoot } from 'react-dom/client';
import { LandingPage } from './LandingPage';
import '../index.css';

hydrateRoot(document.getElementById('root')!, <LandingPage />);
```

`apps/web/src/pages/pricing.tsx`:

```tsx
import React from 'react';
import { hydrateRoot } from 'react-dom/client';
import { PricingPage } from './PricingPage';
import '../index.css';

hydrateRoot(document.getElementById('root')!, <PricingPage />);
```

- [ ] **Step 6: Create HTML entries**

`apps/web/product/index.html`:

```html
<!doctype html>
<html lang="en" class="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>GrowthVoice OS — AI voice agent that qualifies website visitors</title>
    <meta name="description" content="GrowthVoice OS is a browser voice agent that qualifies website visitors out loud and writes each lead into your CRM mid-call, with US AI-disclosure and recording-consent built in. Built on the AssemblyAI Voice Agent API." />
    <link rel="canonical" href="https://growthvoice-os.vercel.app/product" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="GrowthVoice OS" />
    <meta property="og:title" content="GrowthVoice OS — a voice agent that qualifies your website visitors" />
    <meta property="og:description" content="Visitors click, speak, and are qualified in real time. Leads land in your CRM while the call is still going, with US AI-disclosure and consent handled first." />
    <meta property="og:url" content="https://growthvoice-os.vercel.app/product" />
    <meta name="twitter:card" content="summary" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
    <!--app-head-->
  </head>
  <body class="bg-[#080C14] text-slate-100 font-['Plus_Jakarta_Sans',sans-serif] antialiased min-h-screen">
    <div id="root"><!--app-html--></div>
    <script type="module" src="/src/pages/product.tsx"></script>
  </body>
</html>
```

`apps/web/pricing/index.html`:

```html
<!doctype html>
<html lang="en" class="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Pricing — GrowthVoice OS</title>
    <meta name="description" content="GrowthVoice OS pricing: Starter, Pro and Enterprise plans with included voice minutes, per-minute overage rates and annual discounts, for a voice agent that qualifies website visitors." />
    <link rel="canonical" href="https://growthvoice-os.vercel.app/pricing" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="GrowthVoice OS" />
    <meta property="og:title" content="GrowthVoice OS pricing" />
    <meta property="og:description" content="Plans with included voice minutes, overage rates and annual discounts for a voice agent that qualifies your website visitors." />
    <meta property="og:url" content="https://growthvoice-os.vercel.app/pricing" />
    <meta name="twitter:card" content="summary" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
    <!--app-head-->
  </head>
  <body class="bg-[#080C14] text-slate-100 font-['Plus_Jakarta_Sans',sans-serif] antialiased min-h-screen">
    <div id="root"><!--app-html--></div>
    <script type="module" src="/src/pages/pricing.tsx"></script>
  </body>
</html>
```

The pricing description names plans but no figures, so it cannot drift from `plans.json`.

- [ ] **Step 7: Create `scripts/prerender.mjs`**

```js
/**
 * Writes prerendered HTML into dist/product and dist/pricing so crawlers that do
 * not run JavaScript see the content. Runs after `vite build` and the SSR build.
 * Any failure exits non-zero, which fails the deploy instead of shipping an empty page.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';

const webRoot = fileURLToPath(new URL('..', import.meta.url));
const { render, renderHead } = await import(pathToFileURL(`${webRoot}dist-ssr/entry-server.js`).href);

for (const page of ['product', 'pricing']) {
  const file = `${webRoot}dist/${page}/index.html`;
  const template = await readFile(file, 'utf8');
  if (!template.includes('<!--app-html-->') || !template.includes('<!--app-head-->')) {
    console.error(`prerender: placeholder missing in ${file}`);
    process.exit(1);
  }
  // Function replacers: rendered prices contain "$", which string replacements treat as patterns.
  const html = template
    .replace('<!--app-head-->', () => renderHead(page))
    .replace('<!--app-html-->', () => render(page));
  await writeFile(file, html);
  console.log(`prerender: ${page} -> ${html.length} bytes`);
}
```

- [ ] **Step 8: Wire the build**

Replace `apps/web/vite.config.ts` with:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const entry = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true
      },
      '/ws': {
        target: 'ws://localhost:4000',
        ws: true
      }
    }
  },
  // The SSR build (prerender) takes its entry from --ssr; only the client build is multi-page.
  build: isSsrBuild
    ? {}
    : {
        rollupOptions: {
          input: {
            main: entry('./index.html'),
            product: entry('./product/index.html'),
            pricing: entry('./pricing/index.html')
          }
        }
      }
}));
```

In `apps/web/package.json`, replace:

```json
    "build": "tsc || true && vite build",
```

with:

```json
    "build": "tsc || true && vite build && vite build --ssr src/pages/entry-server.tsx --outDir dist-ssr && node scripts/prerender.mjs",
```

In `apps/web/tailwind.config.js`, replace:

```js
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
```

with:

```js
  content: ['./index.html', './product/index.html', './pricing/index.html', './src/**/*.{js,ts,jsx,tsx}'],
```

In `.gitignore`, directly after the existing `dist/` line, add:

```
dist-ssr/
```

- [ ] **Step 9: Build and verify the output**

Run: `npm run build --workspace apps/web`
Expected: ends with `prerender: product -> <N> bytes` and `prerender: pricing -> <N> bytes`, exit 0.

Run:

```bash
node -e "
const fs=require('fs');
for (const p of ['product','pricing']) {
  const h=fs.readFileSync('apps/web/dist/'+p+'/index.html','utf8');
  if (h.includes('<!--app-html-->')||h.includes('<!--app-head-->')) throw new Error(p+': placeholder left');
  if (/<div id=\"root\"><\/div>/.test(h)) throw new Error(p+': empty root');
  const ld=h.match(/<script type=\"application\/ld\+json\">(.*?)<\/script>/s); JSON.parse(ld[1]);
  console.log(p, 'OK', h.length, 'bytes');
}
const pr=fs.readFileSync('apps/web/dist/pricing/index.html','utf8');
for (const s of ['\$149','\$449','\$1,497','\$119','\$0.30/min']) if(!pr.includes(s)) throw new Error('pricing missing '+s);
if (fs.readFileSync('apps/web/dist/index.html','utf8').includes('LandingPage')) throw new Error('console bundle references pages');
console.log('prices present');
"
```

Expected: `product OK …`, `pricing OK …`, `prices present`.

Run: `npm test --workspace apps/web`
Expected: PASS — all web tests (smoke + Tasks 2-4).

- [ ] **Step 10: Commit**

```bash
git add apps/web/src/pages/entry-server.tsx apps/web/src/pages/entry-server.test.tsx apps/web/src/pages/product.tsx apps/web/src/pages/pricing.tsx apps/web/product/index.html apps/web/pricing/index.html apps/web/scripts/prerender.mjs apps/web/vite.config.ts apps/web/package.json apps/web/tailwind.config.js .gitignore
git commit -m "feat(web): prerender /product and /pricing at build time"
```

---

### Task 5: `?plan=` deep link into the console plans modal

**Files:**
- Create: `apps/web/src/utils/planParam.ts`
- Test: `apps/web/src/utils/planParam.test.ts`
- Modify: `apps/web/src/components/SubscriptionPlansModal.tsx:17-33` (props), `:166-178` (card)
- Test: `apps/web/src/components/SubscriptionPlansModal.test.tsx`
- Modify: `apps/web/src/App.tsx:54` (import), `:82` (state + effect), `:2422-2423` (header links), `:3179-3181` (modal props)

**Interfaces:**
- Consumes: `PLANS` from `../pages/plans` (Task 2) in the modal test only.
- Produces: `parsePlanParam(search: string): SubscriptionTierId | null`; modal prop `highlightPlanId?: SubscriptionTierId`; highlighted card carries `data-highlighted="true"`.

- [ ] **Step 1: Write the failing tests**

Create `apps/web/src/utils/planParam.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parsePlanParam } from './planParam';

describe('parsePlanParam', () => {
  it.each([
    ['?plan=starter', 'starter'],
    ['?plan=pro', 'pro'],
    ['?utm_source=x&plan=enterprise', 'enterprise']
  ])('reads %s', (search, expected) => {
    expect(parsePlanParam(search)).toBe(expected);
  });

  it.each(['', '?plan=gold', '?plan=', '?other=pro'])('ignores %j', (search) => {
    expect(parsePlanParam(search)).toBeNull();
  });
});
```

Create `apps/web/src/components/SubscriptionPlansModal.test.tsx`:

```tsx
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SubscriptionPlansModal } from './SubscriptionPlansModal';
import { PLANS } from '../pages/plans';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('SubscriptionPlansModal highlightPlanId', () => {
  it('marks only the requested plan card as highlighted', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(url.includes('/api/billing/plans') ? { plans: PLANS } : { result: null })
        })
      )
    );

    render(<SubscriptionPlansModal isOpen onClose={() => {}} clientId="Acme" highlightPlanId="enterprise" />);

    const enterprise = await screen.findByText('Enterprise');
    expect(enterprise.closest('[data-highlighted="true"]')).not.toBeNull();
    expect(screen.getByText('Starter').closest('[data-highlighted="true"]')).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test --workspace apps/web -- planParam SubscriptionPlansModal`
Expected: FAIL — `Failed to resolve import "./planParam"`, and the modal test fails because no element has `data-highlighted`.

- [ ] **Step 3: Create `planParam.ts`**

```ts
import type { SubscriptionTierId } from '@voice-os/shared';

const TIERS: readonly SubscriptionTierId[] = ['starter', 'pro', 'enterprise'];

/** Reads ?plan=<tier> from a location.search string; the /pricing page links here. */
export function parsePlanParam(search: string): SubscriptionTierId | null {
  const value = new URLSearchParams(search).get('plan');
  return TIERS.includes(value as SubscriptionTierId) ? (value as SubscriptionTierId) : null;
}
```

- [ ] **Step 4: Add `highlightPlanId` to the modal**

In `apps/web/src/components/SubscriptionPlansModal.tsx`, replace:

```tsx
  onOpenEmbedModal?: () => void;
  isGlass?: boolean;
}
```

with:

```tsx
  onOpenEmbedModal?: () => void;
  isGlass?: boolean;
  /** Plan to ring, e.g. from a /pricing "Get started" link (/?plan=pro). */
  highlightPlanId?: SubscriptionTierId;
}
```

Replace:

```tsx
  clientId,
  onOpenEmbedModal
}) => {
```

with:

```tsx
  clientId,
  onOpenEmbedModal,
  highlightPlanId
}) => {
```

Replace:

```tsx
            const busy = checkoutPlan === plan.id;
            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl p-6 flex flex-col justify-between ${
                  featured
                    ? 'border-2 border-amber-400/60 bg-gradient-to-b from-amber-500/[0.08] to-amber-500/[0.02] md:-translate-y-2'
                    : 'border border-white/10 bg-white/[0.02]'
                }`}
              >
```

with:

```tsx
            const busy = checkoutPlan === plan.id;
            const highlighted = plan.id === highlightPlanId;
            return (
              <div
                key={plan.id}
                data-highlighted={highlighted ? 'true' : undefined}
                className={`relative rounded-2xl p-6 flex flex-col justify-between ${
                  featured
                    ? 'border-2 border-amber-400/60 bg-gradient-to-b from-amber-500/[0.08] to-amber-500/[0.02] md:-translate-y-2'
                    : 'border border-white/10 bg-white/[0.02]'
                } ${highlighted ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-[#121217]' : ''}`}
              >
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test --workspace apps/web -- planParam SubscriptionPlansModal`
Expected: PASS — 8 tests (7 parse cases + 1 modal).

- [ ] **Step 6: Wire `App.tsx`**

Directly after `import { SubscriptionPlansModal } from './components/SubscriptionPlansModal';` (line 54), add:

```tsx
import { parsePlanParam } from './utils/planParam';
```

Replace:

```tsx
  const [activeSimulationKey, setActiveSimulationKey] = useState<string | null>(null);
```

with:

```tsx
  const [activeSimulationKey, setActiveSimulationKey] = useState<string | null>(null);
  const [highlightPlanId, setHighlightPlanId] = useState<SubscriptionTierId | undefined>(undefined);

  // /pricing "Get started" links arrive as /?plan=<tier>: open the plans modal on that plan.
  useEffect(() => {
    const planId = parsePlanParam(window.location.search);
    if (planId) {
      setHighlightPlanId(planId);
      setIsPlansModalOpen(true);
    }
  }, []);
```

Replace:

```tsx
            <span>💎 Plans & ROI</span>
          </button>
```

with:

```tsx
            <span>💎 Plans & ROI</span>
          </button>

          {/* Crawlable product and pricing pages */}
          <a
            href="/product"
            className={`hidden md:inline-flex px-3 py-1.5 rounded-xl text-xs font-mono font-semibold border transition-all ${
              isGlass ? 'bg-white/80 border-[#e2ded5] text-slate-700 hover:text-slate-950' : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            Product
          </a>
          <a
            href="/pricing"
            className={`hidden md:inline-flex px-3 py-1.5 rounded-xl text-xs font-mono font-semibold border transition-all ${
              isGlass ? 'bg-white/80 border-[#e2ded5] text-slate-700 hover:text-slate-950' : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            Pricing
          </a>
```

Replace:

```tsx
        onOpenEmbedModal={() => setIsEmbedModalOpen(true)}
        isGlass={isGlass}
      />

      {/* 1-Click Embed Snippet Generator Modal */}
```

with:

```tsx
        onOpenEmbedModal={() => setIsEmbedModalOpen(true)}
        isGlass={isGlass}
        highlightPlanId={highlightPlanId}
      />

      {/* 1-Click Embed Snippet Generator Modal */}
```

- [ ] **Step 7: Typecheck and full web tests**

Run: `cd apps/web && npx tsc --noEmit; echo "exit $?"; cd ../..`
Expected: `exit 0`.

Run: `npm test --workspace apps/web`
Expected: PASS — all web tests.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/utils/planParam.ts apps/web/src/utils/planParam.test.ts apps/web/src/components/SubscriptionPlansModal.tsx apps/web/src/components/SubscriptionPlansModal.test.tsx apps/web/src/App.tsx
git commit -m "feat(web): open the plans modal from /?plan= and link the new pages"
```

---

### Task 6: Discovery files link the new pages

**Files:**
- Modify: `apps/web/public/sitemap.xml`
- Modify: `apps/web/public/llms.txt` (`## Links`)
- Modify: `apps/web/index.html` (`<noscript>` last paragraph)

**Interfaces:**
- Consumes: routes `/product`, `/pricing` (Task 4).
- Produces: nothing consumed by code.

- [ ] **Step 1: Write the failing check**

Run:

```bash
node -e "
const fs=require('fs');
const s=fs.readFileSync('apps/web/public/sitemap.xml','utf8'), l=fs.readFileSync('apps/web/public/llms.txt','utf8'), i=fs.readFileSync('apps/web/index.html','utf8');
const miss=[];
for (const p of ['/product','/pricing']) { if(!s.includes('growthvoice-os.vercel.app'+p+'<')) miss.push('sitemap '+p); if(!l.includes('growthvoice-os.vercel.app'+p+')')) miss.push('llms '+p); if(!i.includes('href=\"'+p+'\"')) miss.push('noscript '+p); }
if (miss.length) { console.error('MISSING', miss); process.exit(1); } console.log('links OK');
"
```

Expected: FAIL — `MISSING [ 'sitemap /product', 'llms /product', 'noscript /product', 'sitemap /pricing', 'llms /pricing', 'noscript /pricing' ]`.

- [ ] **Step 2: Update `sitemap.xml`**

Replace:

```xml
  <url>
    <loc>https://growthvoice-os.vercel.app/</loc>
    <lastmod>2026-09-13</lastmod>
  </url>
</urlset>
```

with:

```xml
  <url>
    <loc>https://growthvoice-os.vercel.app/</loc>
    <lastmod>2026-09-13</lastmod>
  </url>
  <url>
    <loc>https://growthvoice-os.vercel.app/product</loc>
    <lastmod>2026-09-13</lastmod>
  </url>
  <url>
    <loc>https://growthvoice-os.vercel.app/pricing</loc>
    <lastmod>2026-09-13</lastmod>
  </url>
</urlset>
```

- [ ] **Step 3: Update `llms.txt`**

Replace:

```markdown
- [Live demo](https://growthvoice-os.vercel.app/)
```

with:

```markdown
- [Product overview](https://growthvoice-os.vercel.app/product)
- [Pricing](https://growthvoice-os.vercel.app/pricing)
- [Live demo](https://growthvoice-os.vercel.app/)
```

- [ ] **Step 4: Update the `<noscript>` block in `apps/web/index.html`**

Replace:

```html
        <p>The live console needs JavaScript. Source code: <a href="https://github.com/dev4-gpt/VoiceAI">github.com/dev4-gpt/VoiceAI</a>.</p>
```

with:

```html
        <p>The live console needs JavaScript. Read the <a href="/product">product overview</a> and <a href="/pricing">pricing</a>, or the source code at <a href="https://github.com/dev4-gpt/VoiceAI">github.com/dev4-gpt/VoiceAI</a>.</p>
```

- [ ] **Step 5: Re-run the check, build and all tests**

Run the Step 1 command again.
Expected: `links OK`.

Run: `npm run build --workspace apps/web && npm test --workspace apps/web && npm test --workspace apps/orchestrator`
Expected: build ends with both `prerender:` lines; all web and orchestrator tests PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/public/sitemap.xml apps/web/public/llms.txt apps/web/index.html
git commit -m "feat(seo): list /product and /pricing in sitemap, llms.txt and noscript"
```

---

### Task 7: Deploy, verify production, re-audit

**Files:**
- Modify: `docs/geo/GEO-AUDIT-REPORT.md` (append section)

**Interfaces:**
- Consumes: everything above, deployed.
- Produces: verified live pages and an updated audit score.

- [ ] **Step 1: Confirm with the user, then push**

Pushing to `master` deploys production. Ask the user before running:

```bash
git push origin master
```

- [ ] **Step 2: Wait for the deploy**

Run (polls up to 10 minutes):

```bash
for i in $(seq 1 40); do c=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 https://growthvoice-os.vercel.app/pricing); [ "$c" = "200" ] && curl -s https://growthvoice-os.vercel.app/pricing | grep -q '\$449' && { echo "LIVE after ~$((i*15))s"; break; }; sleep 15; done
```

Expected: `LIVE after ~…s`. If `/pricing` or `/product` still returns 404 once the Vercel deployment shows Ready, add these as the first two entries of `rewrites` in `vercel.json`: `{ "source": "/product", "destination": "/product/index.html" }` and `{ "source": "/pricing", "destination": "/pricing/index.html" }`; commit `fix(deploy): route /product and /pricing to prerendered HTML`; push; repeat this step.

- [ ] **Step 3: Verify production without JavaScript**

Run:

```bash
U=https://growthvoice-os.vercel.app
for p in /product /pricing / /widget-preview /robots.txt /sitemap.xml /llms.txt /api/health "/?plan=pro"; do printf "%-18s %s\n" "$p" "$(curl -s -o /dev/null -w '%{http_code}' --max-time 30 "$U$p")"; done
curl -s $U/product | grep -c 'A voice agent that qualifies your website visitors'
curl -s $U/pricing | grep -o '\$149\|\$449\|\$1,497\|\$0.30/min' | sort -u
curl -s $U/api/billing/plans | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).plans.map(p=>p.name+' '+p.priceMonthlyUsd).join(', ')))"
curl -s -X POST $U/api/voice/token -H 'Content-Type: application/json' -d '{}' -o /dev/null -w 'voice token HTTP %{http_code}\n'
```

Expected: every path `200`; product heading count `1`; pricing shows `$0.30/min`, `$1,497`, `$149`, `$449`; plans API prints `Starter 149, Pro 449, Enterprise 1497` (proves the Vercel function bundles `plans.json`); `voice token HTTP 200`.

- [ ] **Step 4: Manual check in a browser**

Open `https://growthvoice-os.vercel.app/pricing`, click **Annual**, confirm prices switch to $119 / $359 / $1,197, click **Get started with Pro**, confirm the console opens with the plans modal showing a cyan ring on Pro. Check the browser console on `/pricing` and `/product` for hydration warnings (expected: none).

- [ ] **Step 5: Re-score and append to the report**

Append a section `## Re-audit after /product and /pricing (2026-09-13)` to `docs/geo/GEO-AUDIT-REPORT.md` containing:

1. A verification table with one row per Step 3 check (`/product` H1 in raw HTML, `/pricing` prices and overage in raw HTML, JSON-LD types per page, `/api/billing/plans` output, voice token status), each marked ✅ or ❌ with the observed value copied from the Step 3 output.
2. A score table with the same six categories and weights used in the report's earlier sections (Citability 25%, Brand 20%, E-E-A-T 20%, Technical 15%, Schema 10%, Platform 10%), a Before column (the previous re-audit's scores) and an After column scored from the verified results, and the weighted overall.
3. A "Still open" line listing: security headers, sample-persona links, brand presence beyond GitHub.

- [ ] **Step 6: Commit and push the report (confirm with the user first)**

```bash
git add docs/geo/GEO-AUDIT-REPORT.md
git commit -m "docs(geo): re-audit after /product and /pricing pages"
git push origin master
```
