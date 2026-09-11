import { eq, and, gte, desc, sql } from 'drizzle-orm';
import { getDb, isDatabaseConfigured } from './client';
import { organizations, subscriptions, usageRecords, consentRecords } from './schema';

/**
 * Persistence for the state that must not be lost.
 *
 * Every function here no-ops or returns null when DATABASE_URL is unset, so the
 * app still runs without a database — it just cannot remember anything, and the
 * caller reports that rather than pretending otherwise.
 */

/** Stable slug so the same company name always maps to the same tenant row. */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 100);
}

const tenantCache = new Map<string, string>();

/**
 * Resolves a company name to a tenant id, creating the organization on first
 * sight. Real multi-tenant auth is deferred; until it lands this is how a
 * caller-supplied name becomes a row. Cached because it sits on the hot path of
 * every write.
 */
export async function resolveTenantId(companyName: string): Promise<string | null> {
  if (!isDatabaseConfigured()) return null;

  const slug = slugify(companyName || 'default');
  const cached = tenantCache.get(slug);
  if (cached) return cached;

  const db = getDb();
  const existing = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.slug, slug))
    .limit(1);

  if (existing.length) {
    tenantCache.set(slug, existing[0].id);
    return existing[0].id;
  }

  const inserted = await db
    .insert(organizations)
    .values({ name: companyName || 'Default', slug })
    // Concurrent requests for a new company would otherwise race to insert.
    .onConflictDoUpdate({ target: organizations.slug, set: { updatedAt: new Date() } })
    .returning({ id: organizations.id });

  tenantCache.set(slug, inserted[0].id);
  return inserted[0].id;
}

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

export interface ConsentRow {
  id: string;
  sessionId: string;
  companyName: string;
  region: string;
  consentRequirement: string;
  consentMethod: string;
  disclosureText: string;
  disclosedAt: Date;
  consentGrantedAt: Date | null;
  userAgent: string;
}

/** Consent evidence is insert-only; there is no update path by design. */
export async function insertConsent(tenantId: string, row: ConsentRow): Promise<void> {
  if (!isDatabaseConfigured()) return;
  const db = getDb();
  await db.insert(consentRecords).values({ tenantId, ...row }).onConflictDoNothing();
}

export async function listConsent(tenantId: string, limit = 200) {
  if (!isDatabaseConfigured()) return null;
  const db = getDb();
  return db
    .select()
    .from(consentRecords)
    .where(eq(consentRecords.tenantId, tenantId))
    .orderBy(desc(consentRecords.createdAt))
    .limit(limit);
}
