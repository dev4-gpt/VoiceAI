# GEO Audit Report: GrowthVoice OS

**Audit Date:** 2026-09-13
**URL:** https://growthvoice-os.vercel.app
**Business Type:** SaaS (pricing tiers, embeddable widget, checkout) — currently deployed as a product demo console, not a marketing site
**Pages Analyzed:** 2 of 2 reachable (`/`, `/widget-preview`); `/pricing`, `/about`, `/blog` return 404
**Method:** raw HTTP fetch (what non-JS AI crawlers see) + headless Chromium render (what a browser sees), desktop 1440×900 and mobile 390×844. Screenshots in [`screenshots/`](screenshots/).

---

## Executive Summary

**Overall GEO Score: 12/100 (Critical)**

The live app works well as a demo — it loads in ~1 s, serves over HTTPS with HSTS, and the voice stack is healthy — but it is close to invisible to AI search. The server returns an empty `<div id="root">` with no description, and GPTBot, ClaudeBot and PerplexityBot do not execute JavaScript, so they index a title and nothing else. There is no robots.txt, sitemap, llms.txt or structured data, and no third-party brand mentions yet. The fix is small and mostly static files: a crawlable landing page plus five discovery files.

### Score Breakdown

| Category | Score | Weight | Weighted Score |
|---|---|---|---|
| AI Citability | 10/100 | 25% | 2.5 |
| Brand Authority | 8/100 | 20% | 1.6 |
| Content E-E-A-T | 20/100 | 20% | 4.0 |
| Technical GEO | 25/100 | 15% | 3.8 |
| Schema & Structured Data | 0/100 | 10% | 0.0 |
| Platform Optimization | 5/100 | 10% | 0.5 |
| **Overall GEO Score** | | | **12/100** |

---

## Critical Issues (Fix Immediately)

1. **No indexable content without JavaScript** — `/` (all content)
   Raw HTML is 974 bytes: a `<title>`, font links, a 488 KB JS bundle and an empty root div. The 709 words visible in a browser do not exist for non-rendering crawlers.
   **Fix:** serve a static, pre-rendered landing page at `/` (move the console to `/app`), or prerender `/` at build time (e.g. `vite-plugin-prerender` / `vite-ssg`). At minimum put a real `<noscript>` summary in `apps/web/index.html`.

2. **Complete absence of structured data** — all pages
   No JSON-LD on either page. **Fix:** add `Organization` + `SoftwareApplication` (with `offers` for the three tiers) + `FAQPage`. Template below.

3. **Brand not recognized as an entity**
   Web search for `"GrowthVoice OS"` returns only unrelated "Growth OS" products (growthos.net, Publicis Growth OS, Intempt). The name collides with established brands, so AI systems will conflate or ignore it.

## High Priority Issues

4. **No `llms.txt`** — `/llms.txt` → 404.
5. **No `robots.txt`** — `/robots.txt` → 404. Not blocking, but no explicit AI-crawler allowances and no sitemap pointer.
6. **No `sitemap.xml`** — `/sitemap.xml`, `/sitemap_index.xml` → 404.
7. **Zero question-answering content** — no "What is…", "How does…", "How much…" blocks anywhere. The README contains excellent citable passages (problem, how it works, US compliance, pricing, unit economics) that never reach the site.
8. **Pricing is not a crawlable page** — pricing lives in a modal ("💎 Plans & ROI"); `/pricing` 404s. Pricing pages are among the most-cited SaaS pages in AI answers.
9. **No meta description, Open Graph, Twitter Card or canonical** on either page — link previews on X/LinkedIn/Slack show nothing.

## Medium Priority Issues

10. **Unverifiable claims visible on the site** (trust / E-E-A-T):
    - `WS RTT: <25ms` is a hardcoded fallback when no measurement exists — `apps/web/src/App.tsx:2369`. Your own CLAUDE.md says no latency figure should be quoted.
    - `AssemblyAI Universal-3.5 Pro` badge — `apps/web/src/App.tsx:2298` (model name not verified against the Voice Agent API).
    - `Scale pipeline by 3.8x` — `apps/orchestrator/src/public/widget-preview.html:119`.
    AI systems and hackathon judges both discount sites with unsupported numbers. Remove or label as illustrative.
11. **No About / team / author attribution** — no named builder, no link to the GitHub repo, no contact.
12. **Demo persona links look like real people** — homepage links to `x.com/jasonmiller_ui`, `linkedin.com/in/jasonmiller-design`, `jasonmiller.substack.com` etc. If fictional, these may point at real third-party accounts; replace with `example.com` or mark clearly as sample data.
13. **Jargon-heavy copy** — "Stratum 0: Acoustic Surface", "Warp to CRM (Z = -1,800m)", "Synthesizer Reactor". Great for a demo, low citability: an AI cannot extract what the product does from these headings.
14. **No Wikipedia / Reddit / YouTube presence** (expected at this stage).

## Low Priority Issues

15. **Mobile:** the "Scroll mouse wheel to Dive Forward…" hint overlays content on a 390 px viewport and references a mouse ([`home-mobile.png`](screenshots/home-mobile.png)).
16. **Heading hierarchy** — H1 then H3s before the first H2.
17. **Security headers** — HSTS present; no `Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` (add via `headers` in `vercel.json`).
18. **Single 488 KB JS bundle** — fine for the console, but a landing page should not require it.
19. **Widget preview page title** says "SaaSFlow Cloud" — correct for a sample customer page, but add `noindex` so it isn't mistaken for your brand.

---

## Category Deep Dives

### AI Citability (10/100)
- **Raw HTML (what AI crawlers get):** 0 citable passages.
- **Rendered page:** 709 words, almost entirely UI labels and button text. The only self-contained explanatory passage:
  > "In production, this voice widget lives on the Creator's website. When an after-hours Prospective Buyer speaks, Anna qualifies their BANT budget, books consultations…"
  That is decent but hidden inside the console. Score it would earn if server-rendered: ~45.
- **Rewrite suggestion** (134–167-word answer blocks are the most-cited length). Lift directly from README:
  > **What is GrowthVoice OS?** GrowthVoice OS is a browser voice agent for B2B websites. A visitor clicks, speaks, and is answered in real time. While talking, the agent calls tools that create the lead, record budget, authority, need and timeline, and capture a consultation request in a Postgres-backed CRM. Before it listens, it discloses that it is an AI and, in the 13 US all-party-consent states, asks permission to transcribe. It runs on the AssemblyAI Voice Agent API and embeds on any site with one script tag.

### Brand Authority (8/100)
| Platform | Presence |
|---|---|
| Web search ("GrowthVoice OS") | None — results are other "Growth OS" brands |
| GitHub | [dev4-gpt/VoiceAI](https://github.com/dev4-gpt/VoiceAI) — public, good description and topics, 0 stars; repo name doesn't match brand |
| lablab.ai hackathon page | Not found in search yet (submit/indexing pending) |
| LinkedIn / X / YouTube / Reddit / Wikipedia | None found |

Name collision is the biggest long-term risk; decide now whether to keep "GrowthVoice OS" and use it consistently (repo name, lablab submission, social handles).

### Content E-E-A-T (20/100)
- **Experience/Expertise:** real engineering depth exists (compliance layer, encryption, 63 tests) but is only in the repo.
- **Authoritativeness:** no author, no about page, no external citations (e.g. to California AB 2905, Texas SB 140 — which the README already names).
- **Trustworthiness:** README is admirably honest ("What is real today" table). The site contradicts it with the three unverified claims in issue 10. Aligning the site with the README would raise this category the most for the least work.

### Technical GEO (25/100)
| Check | Result |
|---|---|
| HTTPS + HSTS (preload) | ✅ |
| Response time / render | ✅ ~0.2 s TTFB cached, ~1.05 s networkidle |
| Server-side rendered content | ❌ empty root div |
| robots.txt | ❌ 404 |
| sitemap.xml | ❌ 404 |
| llms.txt | ❌ 404 |
| Meta description / canonical / OG | ❌ none |
| Deep links (`/pricing`, `/about`) | ❌ 404 — `vercel.json` has no SPA fallback rewrite |
| Mobile viewport meta | ✅ |
| Image alt text | ✅ n/a (0 `<img>`) |
| `lang` attribute | ✅ `en` |

### Schema & Structured Data (0/100)
None found. Recommended JSON-LD for `apps/web/index.html` `<head>`:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://growthvoice-os.vercel.app/#org",
      "name": "GrowthVoice OS",
      "url": "https://growthvoice-os.vercel.app",
      "sameAs": ["https://github.com/dev4-gpt/VoiceAI"]
    },
    {
      "@type": "SoftwareApplication",
      "name": "GrowthVoice OS",
      "applicationCategory": "BusinessApplication",
      "operatingSystem": "Web",
      "description": "Browser voice agent that qualifies website visitors out loud and writes leads into a CRM, with US AI-disclosure and recording-consent built in. Built on the AssemblyAI Voice Agent API.",
      "publisher": { "@id": "https://growthvoice-os.vercel.app/#org" },
      "offers": [
        { "@type": "Offer", "name": "Starter", "price": "149", "priceCurrency": "USD" },
        { "@type": "Offer", "name": "Pro", "price": "449", "priceCurrency": "USD" },
        { "@type": "Offer", "name": "Enterprise", "price": "1497", "priceCurrency": "USD" }
      ]
    }
  ]
}
</script>
```

### Platform Optimization (5/100)
| Platform | Readiness | Blocker |
|---|---|---|
| Google AI Overviews | Low | Googlebot renders JS, but no description, schema, or Q&A content |
| ChatGPT search | Very low | GPTBot/OAI-SearchBot don't run JS → empty page |
| Perplexity | Very low | PerplexityBot doesn't run JS; no llms.txt |
| Claude | Very low | ClaudeBot doesn't run JS |
| Bing Copilot | Low | No sitemap for IndexNow/Bing Webmaster submission |

---

## Quick Wins (Implement This Week)

1. **Add static meta to `apps/web/index.html`:** `<meta name="description">`, OG/Twitter tags, `<link rel="canonical">`, the JSON-LD above, and a `<noscript>` block with the "What is GrowthVoice OS?" paragraph. *Unblocks every AI crawler from seeing what the product is.*
2. **Create `apps/web/public/robots.txt`** allowing all crawlers (explicitly `GPTBot`, `OAI-SearchBot`, `ClaudeBot`, `PerplexityBot`, `Google-Extended`) and pointing to the sitemap; disallow `/api/`.
3. **Create `apps/web/public/llms.txt`** — product summary, how it works, pricing, compliance, links to README and repo.
4. **Create `apps/web/public/sitemap.xml`** listing `/` (and `/pricing` once it exists).
5. **Remove the three unverified claims** (issue 10) so the site matches the README's honesty.

## 30-Day Action Plan

### Week 1: Make the site readable by AI
- [ ] Quick wins 1–5
- [ ] Add `noindex` to `/widget-preview`
- [ ] Add security headers via `vercel.json`

### Week 2: A crawlable front door
- [ ] Pre-rendered landing page at `/` (console moves to `/app`) using README sections: problem, how it works, compliance, pricing, FAQ
- [ ] SPA fallback rewrite in `vercel.json` so deep links don't 404
- [ ] `/pricing` as a real page with `Offer` schema

### Week 3: Citable content
- [ ] FAQ section (6–8 Q&As, 130–170 words each) + `FAQPage` schema: "Is it legal to record website visitors?", "How much does a voice agent cost per minute?", "How does the embed work?"
- [ ] Short technical write-up (dev.to / Hashnode) on the US consent layer, linking back

### Week 4: Brand authority
- [ ] Settle the name (collision with "Growth OS") and align repo name, lablab submission and handles
- [ ] Publish the 60-second demo on YouTube with a transcript
- [ ] Post on r/SaaS or r/sales with the build story; add `sameAs` links for each new profile
- [ ] Re-run `/geo audit` and compare

---

## Appendix: Pages Analyzed

| URL | Title | Words (rendered) | GEO Issues |
|---|---|---|---|
| https://growthvoice-os.vercel.app/ | GrowthVoice OS — AI Growth Operator Voice Console | 709 (0 in raw HTML) | 11 |
| https://growthvoice-os.vercel.app/widget-preview | SaaSFlow Cloud — Embedded GrowthVoice OS Live Sandbox | 81 | 5 |

**Fetch failures (404):** `/robots.txt`, `/sitemap.xml`, `/sitemap_index.xml`, `/llms.txt`, `/llms-full.txt`, `/pricing`, `/about`, `/blog`

**Sources:** [Growth OS (LinkedIn)](https://sg.linkedin.com/company/growth-os) · [GrowthOS](https://growthos.net/) · [Publicis Growth OS](https://shell.growthos.publicismedia.com/) · [Intempt: Growth OS](https://apps.shopify.com/intempt?locale=de) · [AssemblyAI Voice Agent Hackathon (lablab.ai)](https://lablab.ai/ai-hackathons/assemblyai-voice-agent-hackathon)
