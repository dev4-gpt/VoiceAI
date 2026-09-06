---
id: "session_retention_sarah"
title: "Voice Call: Sarah Jenkins (Churn Save & Retention)"
type: "VoiceSession"
date: "2026-09-06"
tags:
  - voicesession
  - growth-voice-os
persona: "churn_retention"
durationSeconds: 198
sentiment: "retained"
audioFormat: "24kHz_mono_pcm16"
asrEngine: "universal-3-5-pro"
outcome: "retained_clamped_15_percent"
---

# Voice Call: Sarah Jenkins (Churn Save & Retention)

> [!info] Node Metadata
> **Type:** `VoiceSession` | **ID:** `session_retention_sarah`

## Properties

| Property | Value |
| :--- | :--- |
| **persona** | `churn_retention` |
| **durationSeconds** | `198` |
| **sentiment** | `retained` |
| **audioFormat** | `24kHz_mono_pcm16` |
| **asrEngine** | `universal-3-5-pro` |
| **outcome** | `retained_clamped_15_percent` |

## Outgoing Relationships

- **-[:RAISED_OBJECTION]->** [[obj_cashflow_tight|Objection: Cash Flow Tight (35% Discount Requested)]] _(Cash Flow Tight)_
- **-[:TRIGGERED_POLICY]->** [[policy_max_discount_15|Guardrail: Max 15% Autonomous Discount]] _(Clamped 35% to 15%)_
