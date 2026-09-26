# StratosGTM: demo call script and clip posts

Written 2026-09-26. Companion to `content-plan.md` (posts D1 to D4 and the claim check). Rules that apply to everything
here: record a real call, never a mock; no speed or latency claim; no results or customer claims; the agent
"qualifies and logs leads", it does not "book meetings".

## 1. Setup (10 minutes, once)

1. Use a clean workspace or the anonymous demo at `https://stratosgtm.vercel.app/console`. Anonymous sessions cap at five
   minutes, which is enough.
2. Use a headset or quiet room; browser mic permission on.
3. Open the CRM board in a second window so the lead can be seen appearing.
4. Screen-record the browser at a size that fits a phone screen. Do not show the Keys panel, any email inbox, or real lead data.
5. Fictional visitor for the call: "Sam Rivera", Rivera Growth Studio, a founder selling a $4,000 group coaching program.
   Use a throwaway email you own so nothing is faked in the CRM.

## 2. The call (target 90 seconds on screen)

You play the visitor. The agent's wording is live and unscripted, so do not read lines for it. Your lines:

| # | You say | What should happen (verify, do not promise) |
|---|---|---|
| 1 | Start the session, wait for the greeting | The AI disclosure is spoken first. Keep it in the clip; it is a selling point. |
| 2 | "Hi, I run a coaching program for agency founders. People visit my site at night and I miss them." | The agent asks about the offer or the visitor. |
| 3 | "The program is four thousand dollars. I get maybe twenty visitors a week who actually want it." | Budget and offer size are captured. |
| 4 | "I'd want to start in the next month or so." | Timeline captured (`qualify_lead`). |
| 5 | "My name is Sam Rivera, sam@ your throwaway address." | `create_or_update_lead` runs; the lead appears on the board. |
| 6 | "Can someone talk to me this week?" | A consultation request is recorded. Do not say it booked a calendar slot. It did not. |
| 7 | End the session | Show the lead card with budget, timeline and the consultation request. |

If the agent does something unexpected, keep the take if it is honest and interesting; re-record if it is wrong or
awkward. Do not edit speech or reorder anything. Trim only dead air at the start and end, and say so in the caption if
you cut anything else.

## 3. Screen plan for the clip

1. Console with the call starting (2 s).
2. Live captions or transcript while you speak (most of the clip).
3. Cut to the CRM board with the new lead card (5 s hold).
4. Text card: "One real call, unedited apart from trimming. The lead is logged in the CRM."

No music with claims, no fake counters, no speed numbers.

## 4. Posts (Bluesky first; each 300 characters or fewer)

**P1: the clip (D1)**
> One real call, start to finish. A visitor asks about a $4,000 program, the agent qualifies budget and timeline, and the lead lands in the CRM. Rough in places, but real. Early days: https://stratosgtm.vercel.app

**P2: the disclosure**
> The first thing the agent does on every call is tell the visitor it is an AI. Not buried in the footer. Spoken, before anything else. If you run a voice agent on your site, this matters more than the voice does.

**P3: the CRM view (D3)**
> The part I like watching: the lead card appears on the board while the call is still going. Name, budget, timeline, and a consultation request. It records the request, it does not book a calendar slot yet. We would rather say so.

**P4: the pilot ask**
> If you sell a $2k+ offer and lose visitors after hours, I would like to run this on your page for 30 days and show you what it catches. $299 for 30 days, no auto-renew, weekly review with me. Three spots. Reply or DM.

**P5: behind the clip (technical readers)**
> Behind the clip: the agent registers seven tools with the voice API. When the visitor says a budget, it calls qualify_lead. The server checks guardrails and writes the lead. Same conversation can seed a post draft. What is real and not: https://stratosgtm.vercel.app/analysis.html

## 5. Longer versions (manual on LinkedIn and X)

**LinkedIn (about 120 words)**
> A visitor lands on a $4,000 program page at 11pm. Nobody is there. Most of the time that visitor is gone.
>
> I have been building StratosGTM: a voice agent that talks with visitors on your site, qualifies them on budget and timeline, and logs the lead to a CRM. Here is one real call, unedited apart from trimming.
>
> What it does not do yet: it does not book a calendar slot (it records a consultation request), and it publishes to Bluesky only, for now.
>
> I am looking for three founders or agencies selling $2k+ offers to run a 30-day pilot with me. $299 for 30 days, no auto-renew, a weekly review. If that is you, message me.

**X thread (5 posts):** use P1, P2, P3, P5, P4 in that order, one per post.

## 6. Before you publish (claim check)

- [ ] The clip is a real, unscripted agent side; nothing sped up or reordered.
- [ ] No latency or speed claim in any caption.
- [ ] No name, email or lead data on screen that is not the fictional visitor.
- [ ] "Consultation request", not "booked".
- [ ] "Pilot" post matches the terms: 30 days, $299, no auto-renew, weekly review. Price is $299 for 30 days, first three pilots.
- [ ] Publish through the app (Publish via TryPost) and confirm the receipt says **published**, then check Bluesky.
