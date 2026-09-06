---
id: "policy_max_discount_15"
title: "Guardrail: Max 15% Autonomous Discount"
type: "GuardrailPolicy"
date: "2026-09-06"
tags:
  - guardrailpolicy
  - growth-voice-os
maxDiscountPercent: 15
enforcement: "deterministic_clamp"
description: "Enforces hard ceiling on autonomous discount concession during retention negotiations."
---

# Guardrail: Max 15% Autonomous Discount

> [!info] Node Metadata
> **Type:** `GuardrailPolicy` | **ID:** `policy_max_discount_15`

## Properties

| Property | Value |
| :--- | :--- |
| **maxDiscountPercent** | `15` |
| **enforcement** | `deterministic_clamp` |
| **description** | `Enforces hard ceiling on autonomous discount concession during retention negotiations.` |

## Incoming Relationships

- **<-[:TRIGGERED_POLICY]-** [[session_retention_sarah|Voice Call: Sarah Jenkins (Churn Save & Retention)]] _(Clamped 35% to 15%)_
