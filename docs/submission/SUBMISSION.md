# Hackathon submission — GrowthVoice OS

Everything the lablab.ai form asks for, ready to paste. Every figure here matches the
code and the README; nothing is rounded up.

---

## Title (47 / 50 characters)

```
GrowthVoice OS: Voice Agents That Capture Leads
```

## Short description (211 / 255 characters)

```
A voice agent that answers your website 24/7, qualifies visitors out loud, and writes each lead into your CRM mid-call through AssemblyAI tool calling, with US AI-disclosure and recording-consent rules built in.
```

## Long description

```
Inbound interest arrives whenever the visitor has time — evenings, weekends, other time zones — and most B2B websites meet it with a contact form and a reply the next business day. By then the visitor has moved on.

GrowthVoice OS puts a voice agent on the website instead. A visitor clicks, speaks, and is heard in the browser: no phone number, no download. The agent runs entirely on AssemblyAI's Voice Agent API. The orchestrator mints a short-lived token so the API key never reaches the browser; the browser streams 24 kHz audio straight to AssemblyAI; and the session registers seven tools. As the visitor talks, the agent calls them — creating the lead, recording budget, authority, need and timeline, capturing a consultation request — and each result returns as a tool result, so the lead is in a Postgres-backed CRM before the call ends.

Because it transcribes visitors on third-party sites, it is built for US law. It discloses that it is an AI before any substantive exchange (California AB 2905, Texas SB 140), asks explicit consent in the 13 all-party-consent states where live transcription can count as interception, applies the strictest policy when location is unknown, and stores an append-only consent record before listening.

It is a real business, not only a demo: one embed line puts it on any site, Stripe Checkout sells three subscription tiers, and a plan activates only when Stripe's signed webhook confirms payment. Priced from AssemblyAI's all-in $0.075 per minute, every tier keeps about 72% gross margin even at full usage — and for a customer at a $3,500 deal size, one extra closed deal roughly every eight months pays for the Pro plan.
```

## Links

| Field | Value |
| :--- | :--- |
| Live application | https://growthvoice-os.vercel.app |
| Embeddable widget demo | https://growthvoice-os.vercel.app/widget-preview |
| Source code | https://github.com/dev4-gpt/VoiceAI |
| Pitch deck (PDF) | [`GrowthVoice-OS-Pitch-Deck.pdf`](GrowthVoice-OS-Pitch-Deck.pdf) |
| Demo video | *Record from the script below and add the link here.* |

## Technologies

AssemblyAI Voice Agent API · TypeScript · React · Vite · Tailwind CSS · Node.js · Express · PostgreSQL (Neon) · Drizzle ORM · Stripe · Vercel · DeepSeek

## How the build maps to the judging criteria

| Criterion | Where to look |
| :--- | :--- |
| **Application of Technology** | The whole conversation runs on the Voice Agent API: server-minted tokens, `session.update` with 7 registered tools (confirmed echoed back by the live API), the `tool.call` → `tool.result` loop, and barge-in. See the README's "How it uses AssemblyAI". |
| **Presentation** | A live URL a judge can talk to, a one-line embeddable widget, and a CRM that updates during the call. |
| **Business value** | Real Stripe checkout, pricing built on the actual per-minute cost, a margin floor enforced by tests, and a break-even that does not depend on assumptions. |
| **Originality** | A US compliance layer — AI disclosure and state-aware recording consent — built into the agent itself rather than left to the customer. |

---

## Demo video script (target 3:30, limit 5:00)

Record the screen with your voice. Every scene shows the live product — nothing is
scripted to fake a result. Rehearse the call once first: it depends on your
microphone, your network and AssemblyAI in real time.

| Time | Show | Say |
| :--- | :--- | :--- |
| **0:00–0:25** | A B2B landing page with a contact form. | "Most inbound interest shows up after hours. It meets a contact form and a reply the next morning — by then the buyer has moved on. GrowthVoice OS answers instead, in voice, right in the browser." |
| **0:25–0:40** | Open growthvoice-os.vercel.app. Start a call; allow the mic. | "This is live, running on AssemblyAI's Voice Agent API. Listen to how it opens." |
| **0:40–1:05** | Let the greeting play in full. | *(Let the disclosure speak.)* "Before anything else, it tells me it's an AI. That's California law. In states that require it, it asks my consent before it transcribes a word." |
| **1:05–2:10** | Talk naturally: your name, company, budget, timeline. Keep the CRM panel on screen. | *(Have the conversation.)* Then: "Watch the CRM. Mid-conversation the agent called `create_or_update_lead`, then `qualify_lead` — the lead appeared and its score updated while I was still talking." |
| **2:10–2:30** | Interrupt the agent mid-sentence. | "And it can be interrupted, like a person." |
| **2:30–2:55** | Open /widget-preview. Start a call from the floating widget. | "Customers add it with one line of script. This is a third-party page — same agent, same tools." |
| **2:55–3:20** | Open Plans & pricing. Move the deal-size slider; point at the break-even card. | "It's a business. Three tiers on Stripe, priced from AssemblyAI's all-in cost of seven and a half cents a minute — about 72% margin even at full usage. At a $3,500 deal, one extra closed deal roughly every eight months pays for Pro." |
| **3:20–3:30** | Back to the console. | "GrowthVoice OS. Every after-hours visitor gets an answer." |

### Before you record

- [ ] Do one full rehearsal call on the live site and confirm the lead appears.
- [ ] Use a quiet room and a headset; laptop speakers can echo into the mic.
- [ ] If you show checkout, use Stripe test card `4242 4242 4242 4242` and say it is test mode.
- [ ] Do not quote a latency number — none has been measured.
