import { eq, and, gte, sql } from 'drizzle-orm';
import { getDb, isDatabaseConfigured } from '../client';
import { subscriptions, usageRecords } from '../schema';

export interface SubscriptionState {
  planId: string;
  billingCycle: string;
  status: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  minutesLimit: number;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
}

/**
 * Writes subscription state from a verified Stripe webhook. This is the row that
 * decides whether a customer is entitled to service, so it is the one piece of
 * state that absolutely cannot live only in memory.
 */
export async function upsertSubscription(tenantId: string, state: SubscriptionState): Promise<void> {
  if (!isDatabaseConfigured()) return;
  const db = getDb();

  await db
    .insert(subscriptions)
    .values({ tenantId, ...state, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: subscriptions.tenantId,
      set: { ...state, updatedAt: new Date() }
    });
}

export async function getSubscription(tenantId: string) {
  if (!isDatabaseConfigured()) return null;
  const db = getDb();
  const rows = await db.select().from(subscriptions).where(eq(subscriptions.tenantId, tenantId)).limit(1);
  return rows[0] ?? null;
}

export interface UsageEvent {
  sessionId?: string | null;
  durationSeconds: number;
  leadCaptured: boolean;
  isAfterHours: boolean;
  dealValueCents: number;
}

export async function recordUsage(tenantId: string, event: UsageEvent): Promise<void> {
  if (!isDatabaseConfigured()) return;
  const db = getDb();
  await db.insert(usageRecords).values({
    tenantId,
    sessionId: event.sessionId ?? null,
    durationSeconds: event.durationSeconds,
    leadCaptured: event.leadCaptured,
    isAfterHours: event.isAfterHours,
    dealValueCents: event.dealValueCents
  });
}

/**
 * Aggregates usage for the current billing period.
 *
 * These numbers are SUMs over the append-only fact table, never a stored
 * counter. A counter drifts the moment a write is retried or a process restarts
 * mid-update; a SUM cannot.
 */
export async function getUsageAggregate(tenantId: string, periodStart: Date) {
  if (!isDatabaseConfigured()) return null;
  const db = getDb();

  const rows = await db
    .select({
      totalSeconds: sql<number>`COALESCE(SUM(${usageRecords.durationSeconds}), 0)::int`,
      callsCount: sql<number>`COUNT(*)::int`,
      leadsCaptured: sql<number>`COALESCE(SUM(CASE WHEN ${usageRecords.leadCaptured} THEN 1 ELSE 0 END), 0)::int`,
      afterHoursLeads: sql<number>`COALESCE(SUM(CASE WHEN ${usageRecords.leadCaptured} AND ${usageRecords.isAfterHours} THEN 1 ELSE 0 END), 0)::int`,
      pipelineCents: sql<number>`COALESCE(SUM(CASE WHEN ${usageRecords.leadCaptured} THEN ${usageRecords.dealValueCents} ELSE 0 END), 0)::bigint`
    })
    .from(usageRecords)
    .where(and(eq(usageRecords.tenantId, tenantId), gte(usageRecords.periodStart, periodStart)));

  const r = rows[0];
  return {
    minutesUsed: Math.round((Number(r.totalSeconds) / 60) * 10) / 10,
    callsCount: Number(r.callsCount),
    leadsCaptured: Number(r.leadsCaptured),
    afterHoursLeadsCaptured: Number(r.afterHoursLeads),
    pipelineGeneratedUsd: Number(r.pipelineCents) / 100
  };
}
