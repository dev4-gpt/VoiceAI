# Multi-Platform Publishing — Feasibility Spike

Status: spike complete, 2026-09-22. Feeds `.claude/prds/multiplatform-publishing-research.prd.md` Milestone 1.

Desk research only (repo/license/README inspection via `gh api` and web search) — no live deployment was attempted. A real host-and-connect test is recommended as the first task of Milestone 2, not this spike, per the go/no-go below.

## 1. Self-hosting feasibility (PRD Task 1)

**TryPost** (`trypostit/trypost`) — corrects an earlier assumption in the PRD/plan: this is **PHP/Laravel**, not Node/TS. Repo root shows `artisan`, `composer.json`, `phpunit.xml`, `compose.yaml`/`compose.prod.yaml`, a `Caddyfile`, and a `docker/` directory — a conventional, well-supported Laravel deployment with first-party Docker Compose files for both dev and prod. Runs as a standard PHP+Postgres(-or-MySQL)+web-server stack; nothing exotic.

**BrightBean Studio** (`brightbeanxyz/brightbean-studio`) — Django 5.x / Python 3.12+, and unusually well-provisioned for one-click deploys: the repo ships `railway.toml`, `render.yaml`, `Procfile`, and `app.json` (Heroku) all in the root, plus its own `docker-compose.yml`/`docker-compose.prod.yml` and a `Dockerfile`. The maintainers have already done the work of making this deployable on exactly the hosts this spike was going to evaluate.

**FreshRSS** — mature, widely self-hosted PHP project (also used as this spike's third target); trivially containerizable, lowest risk of the three since it's a read-only research input, not a publishing backend holding client credentials.

**Cost reality** (revised — corrects the initial finding below): Render's free Hobby plan includes **750 free instance-hours/month per web service**, with no stated cap on the number of projects, up to 25 total services per workspace and 2 environments per project. A single always-on service uses ~730 hours in a 31-day month, so **one TryPost (or BrightBean) instance on Render's Hobby tier is effectively free** within that allowance — a materially better result than first found. Railway remains the fallback if Render's limits are exceeded: its free trial is $5 of credit, then a $1/mo minimum-usage floor. Realistic floor for a single instance: **$0/month on Render's free tier**, with Railway's ~$1-5/mo as a paid-tier fallback if usage grows past the free allowance. ([Render pricing](https://render.com/pricing), [Railway pricing 2026](https://nayankyada.com/blog/railway-pricing-2026-free-tier-limits-usage-costs-when-to-upgrade))

**One concrete operational gotcha for BrightBean specifically**: its own docs state Heroku/Render/Railway all have **ephemeral filesystems** — uploaded media is lost on every redeploy unless `STORAGE_BACKEND=s3` is set, pointing at real S3-compatible storage (Cloudflare R2, AWS S3, or similar). This is a real, small added cost/config step, not a blocker.

**Finding: self-hosting is genuinely viable for both TryPost and BrightBean**, and — revised upward from the initial finding — **effectively free** for a single always-on instance of each on Render's Hobby tier (750 free hours/month covers 24/7 uptime), with Railway as a low-cost paid fallback if usage grows past that. BrightBean still needs S3-compatible storage configured in production (its filesystem is ephemeral on these hosts) — a small added setup step, not a cost blocker.

## 2. Licensing (PRD Task 2)

All three repos — TryPost, BrightBean Studio, and FreshRSS — are licensed **AGPL-3.0**, confirmed directly via `gh api repos/<org>/<repo> --jq '.license.spdx_id'` (not just a README claim).

This is the **exact same license MiroFish carries** in the Buyer Lab spec (§9), which already established OmniVox's posture for this situation: run the tool **unmodified**, as a **separate self-hosted service**, called only **over HTTP** — never linked into or forked into OmniVox's own process. AGPL's network-use copyleft clause is triggered by *modifying* the software and then letting users interact with the modified version over a network; calling an unmodified, upstream instance from another codebase over HTTP does not trigger that obligation. Keep upstream's license and a link to its source visible somewhere in the product (as the Buyer Lab spec already commits to doing for MiroFish), and if OmniVox ever does modify TryPost/BrightBean/FreshRSS, that modified source must be offered back under AGPL.

**This is an engineering posture, not legal advice** — same caveat the Buyer Lab spec gives for MiroFish, and it applies here for the same reason.

**Finding: no license blocker**, provided the same "call unmodified, over HTTP, never fork" discipline already used for MiroFish is followed here.

## 3. Tenant isolation (PRD Task 3)

This came back stronger than expected — **both TryPost and BrightBean have native multi-tenancy built in**, not something OmniVox would need to bolt on:

- **TryPost**: README states plainly, "Made for many clients — Workspaces, roles, and approval flows so an agency or freelancer can run a roster of brands," and "Workspaces — Isolate each brand, client, or project in its own space." A single self-hosted TryPost instance can hold one Workspace per OmniVox tenant.
- **BrightBean Studio**: goes further — an explicit **Organization → Workspace → Member** hierarchy with granular RBAC, a dedicated external-collaborator "Client" role, and per-organization/per-workspace scoped credential storage (`apps/credentials/` — "Platform API credential storage (encrypted)", `apps/organizations/`, `apps/workspaces/` as first-class Django apps in its own source tree). This maps directly onto OmniVox's existing tenant model without requiring a separate hosted instance per tenant.

**Finding: a single shared self-hosted instance of either tool, with one Workspace/Organization per OmniVox tenant, satisfies the "never mix client credentials" constraint** — this is a native feature of both tools, not a gap OmniVox has to engineer around. The remaining work for Milestone 2 is mapping OmniVox's own tenant id to the wrapped tool's Workspace/Organization id and keeping that mapping itself tenant-scoped in OmniVox's own database (mirroring the existing `platform_credentials` per-tenant-row pattern) — not inventing isolation from scratch.

## Go / No-Go

| Tool | Go/No-Go | Reasoning |
|---|---|---|
| **TryPost** | **Go** | AGPL-3.0 (same posture as MiroFish), self-hostable via documented Docker Compose, effectively free on Render's Hobby tier for a single instance, native per-client Workspace isolation, REST API + MCP server fits an AI-driven pipeline better than a human-facing scheduler UI. Confirmed platform list (from its own README): Instagram, Facebook, LinkedIn, X, TikTok, YouTube, Pinterest, Threads, Bluesky, Mastodon, Telegram, Discord — 12 networks as claimed, covering most of the PRD's original target list. Real correction: it's PHP/Laravel, not Node — irrelevant to OmniVox's own stack since it's called over HTTP, not imported as a library. |
| **BrightBean Studio** | **Go** | Same license posture. Best-documented deploy story of the three (official Railway/Render/Heroku configs); effectively free on Render's Hobby tier for a single instance. Deepest native multi-tenancy (Org → Workspace → RBAC → Client role) of the three. Covers platforms TryPost's list may not — confirmed: dev.to and Google Business Profile are BrightBean-only, TryPost covers the rest (Instagram, Facebook, LinkedIn, X, TikTok, YouTube, Pinterest, Threads, Bluesky, Mastodon, Telegram, Discord). One real gotcha: must configure S3-compatible storage in production or lose uploaded media on redeploy. |
| **FreshRSS** | **Go, lower stakes** | Same license posture, mature/widely-deployed, no client credentials pass through it (research-only input), so its isolation and licensing bar is inherently lower than a publishing backend's. |

**Overall: proceed to Milestone 2.** The PRD's "wrap, don't rebuild" strategy holds up under scrutiny — nothing in this spike surfaced a reason to fall back to native per-platform OAuth builds. Recommend TryPost as the primary integration target (closest architectural fit — MCP server designed for exactly this "AI agent publishes" use case) and BrightBean as the platform-coverage complement, per the PRD's original MVP framing.

## What Milestone 2 should verify that this desk spike could not

- An actual local deployment of TryPost (or BrightBean) via its own Docker Compose file, confirming it runs end-to-end and its REST API/MCP surface behaves as documented — this spike read documentation and source structure, it did not run either tool.
- TryPost's exact platform list is now confirmed from its own README (see Go/No-Go table above); BrightBean's exact list was not independently re-verified beyond its README claim — worth a quick confirmation in Milestone 2 if BrightBean's dev.to/Google Business Profile coverage becomes load-bearing.
- Real per-platform credential setup cost — each connected platform (Instagram, Facebook, etc.) needs its own developer-app registration and API credentials, which is user/workspace effort independent of which wrapper tool is chosen.
