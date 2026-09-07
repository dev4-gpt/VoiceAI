---
title: Private Dossiers, Local Vault Protection & Mac Restart Guide
date: 2026-09-06
tags:
  - guide
  - privacy
  - vault-setup
  - macos
  - docker
---

# 🔒 Private Dossiers, Local Vault Protection & Mac Restart Guide

This guide explains how **GrowthVoice OS** secures your private business information, how to use the **Saved Dossier Preset Manager** in the UI, and how to restart the entire application on your Mac.

---

## 1. 🛡️ Problem Solved: Total Privacy for Real Business Use

When using GrowthVoice OS for your own business or client work, you need to input:
- Real company name, website URLs, and proprietary bios
- Personal or client social accounts (LinkedIn, Twitter/X, YouTube, Instagram, Substack)
- Proprietary brand voice guidelines, signature lexicon, and banned terms
- Confidential inbound lead qualification data and pricing tiers

### The Privacy Guarantee:
1. **Public Repository Stays Generic:** Anyone who pulls or clones this repository from GitHub only receives the clean public demo archetype: **Jason Miller / DesignAcademy Studio**.
2. **Private Client Vaults Stay Local:** When you create or enrich a dossier for your own business or clients on your Mac, all generated Markdown files (`vault/Clients/<Your_Company>/`, `vault/Dossiers/`, etc.) stay strictly on your local disk.
3. **Zero Git Leakage:** Custom client vaults and leads are permanently excluded by `.gitignore`. You can safely run `git add .`, `git commit`, and `git push origin master` without any risk of pushing your private business data to GitHub.

---

## 2. ⚙️ How the Git Privacy Shield Operates

GrowthVoice OS mounts `./vault` as a direct volume into the Docker orchestrator container. When Anna qualifies a lead or you click **"Save & Feed to Voice Agent"**, files are written to the host filesystem:

```
vault/
├── Clients/
│   ├── DesignAcademy_Studio/  <-- [PUBLIC DEMO] Tracked in Git
│   │   ├── BrandVoice.md
│   │   └── Dossier.md
│   └── Your_Private_Brand/    <-- [LOCAL ONLY] Ignored by Git!
│       ├── BrandVoice.md
│       ├── Dossier.md
│       └── Scraped_Intel.md
├── Dossiers/
│   ├── DesignAcademy_Studio.md <-- [PUBLIC DEMO] Tracked in Git
│   └── Your_Private_Brand.md   <-- [LOCAL ONLY] Ignored by Git!
└── Leads/
    ├── lead_jm_901.md         <-- [PUBLIC DEMO] Tracked in Git
    ├── lead_jason_miller.md   <-- [PUBLIC DEMO] Tracked in Git
    └── lead_*.md              <-- [LOCAL ONLY] Ignored by Git!
```

### Git Exclusion Rules (`.gitignore`):
```gitignore
# Local Private Vaults (Keep DesignAcademy Studio public demo, ignore user/client dossiers)
vault/Clients/*
!vault/Clients/DesignAcademy_Studio/
!vault/Clients/.gitkeep
vault/Dossiers/*
!vault/Dossiers/DesignAcademy_Studio.md
!vault/Dossiers/.gitkeep
vault/Leads/*
!vault/Leads/lead_jm_901.md
!vault/Leads/lead_jason_miller.md
!vault/Leads/.gitkeep
```

You can verify this anytime on your Mac by running:
```bash
git status
```
Your custom client folders will not appear in the untracked files list.

---

## 3. 🎛️ Saved Dossier Preset Manager (In the UI)

To make it effortless to switch between the public generic demo and your private company details without retyping, a **Preset Manager** is built directly into the **Dossier Enrichment Modal**:

### Available Profiles:
* 🌟 **Default Demo: Jason Miller (DesignAcademy Studio)** — Public archetype (UI/UX community & cohort sprints).
* 🎬 **Sample Creator: Elena Rostova (NeuralCinema AI)** — GenAI filmmaking & VFX mastermind.
* 💼 **Sample SaaS: Alex Rivera (Solopreneur OS)** — Micro-SaaS fractional executive operating system.
* 💾 **My Saved Private Presets** — Any private company profile you save!

### How to Save & Switch Presets:
1. Click **"Enrich Prospect Dossier (Website & LinkedIn)"** in the header or toolbar.
2. In the modal, enter your company name, full name, email, website URL, social handles, bio, tone archetype, signature lexicon, and banned terms.
3. Click **"💾 Save as Preset"** — give it a nickname (e.g. `My Startup` or `Growth Agency`). It is immediately saved in your browser's `localStorage`.
4. Click **"Save & Feed to Voice Agent"** — Anna instantly ingests your context, and the local vault creates your client directory.
5. To switch back to the public demo for testing or screen recordings, open the dropdown and choose **"Default Demo"** (or click **"🔄 Reset to Demo"**).

---

## 4. 🚀 How to Restart GrowthVoice OS on Your Mac

Whenever you pull updates, edit code, or restart your Mac, use the following commands from the project root:

### Step 1: Clean Restart with Docker
```bash
# Navigate to project root
cd path/to/VoiceAI

# Stop and remove previous containers
docker compose down

# Rebuild and start all containers in the background
docker compose up -d --build
```

### Step 2: Check Container Health & Logs
```bash
# View live streaming logs from all services
docker compose logs -f

# Or view specific service logs
docker compose logs -f orchestrator
docker compose logs -f web
```

### Step 3: Open the Web Console
Open your browser to:
```
http://localhost:3000
```
- **Web Console (UI):** `http://localhost:3000`
- **Orchestrator Backend API:** `http://localhost:4000`
- **Redis Cache & Bus:** `localhost:6379`

---

## 5. 🛠️ Local Development Without Docker (Alternative)

If you prefer running processes directly on your Mac without Docker:

```bash
# 1. Start Redis (via Homebrew)
brew services start redis

# 2. Start the Backend Orchestrator
cd apps/orchestrator
npm run dev

# 3. In a separate terminal tab, start the Frontend Web App
cd apps/web
npm run dev
```
Visit `http://localhost:3000`.

---

## 6. ✅ Verification Checklist
- [x] Run `git status` — confirm no private `vault/Clients/<Your_Company>/` directories are staged or untracked.
- [x] Open `http://localhost:3000` and open **Enrich Prospect Dossier**.
- [x] Confirm the **Default Demo (Jason Miller - DesignAcademy Studio)** is pre-loaded by default.
- [x] Select or save a private preset to verify instant form population.
- [x] Confirm Anna's real-time prompt displays your active company name and brand voice persona.
