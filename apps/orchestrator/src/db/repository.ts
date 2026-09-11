import { eq, and, gte, desc, sql } from 'drizzle-orm';
import type { CRMLead, ChurnRiskMember } from '@voice-os/shared';
import type { PlatformCredentials } from '../services/clientCredentialsService';
import { encryptJson, decryptJson, isEncryptionConfigured } from '../services/cryptoService';
import { getDb, isDatabaseConfigured } from './client';
import {
  organizations,
  subscriptions,
  usageRecords,
  consentRecords,
  leads,
  churnMembers,
  platformCredentials
} from './schema';

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

// ---------------------------------------------------------------------------
// CRM: leads and churn-risk members
// ---------------------------------------------------------------------------

/**
 * Tenant that owns records with no company of their own (churn members, leads
 * captured without a company name). Multi-tenant auth will replace this with the
 * authenticated organization; until then it is the operator's own org.
 */
const DEFAULT_TENANT_NAME = process.env.DEFAULT_TENANT_NAME || 'DesignAcademy Studio';

/**
 * Parses to a Date only when the value genuinely is one. The app stores
 * scheduledCallTime as free text ("Tomorrow at 2:00 PM EST"); writing that into a
 * timestamptz column throws. The original string is preserved in `payload`.
 */
function toDateOrNull(value: unknown): Date | null {
  if (!value) return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Upserts a lead. Queryable fields get columns; the complete record goes into
 * `payload` so every field round-trips, including ones without a column.
 */
export async function upsertLead(lead: CRMLead): Promise<void> {
  if (!isDatabaseConfigured()) return;
  const tenantId = await resolveTenantId(lead.companyName || DEFAULT_TENANT_NAME);
  if (!tenantId) return;

  const row = {
    tenantId,
    fullName: lead.fullName,
    email: lead.email || null,
    phone: lead.phone || null,
    companyName: lead.companyName || null,
    source: lead.source || null,
    status: lead.status,
    qualificationScore: lead.qualificationScore ?? 0,
    scheduledCallTime: toDateOrNull(lead.scheduledCallTime),
    notes: lead.notes || [],
    payload: lead as unknown as Record<string, unknown>,
    createdAt: toDateOrNull(lead.createdAt) || new Date(),
    updatedAt: toDateOrNull(lead.updatedAt) || new Date()
  };

  await getDb()
    .insert(leads)
    .values({ id: lead.id, ...row })
    .onConflictDoUpdate({ target: leads.id, set: row });
}

/** Every lead, newest first, reconstructed from the lossless payload. */
export async function listAllLeads(): Promise<CRMLead[]> {
  if (!isDatabaseConfigured()) return [];
  const rows = await getDb().select().from(leads).orderBy(desc(leads.updatedAt));
  return rows
    .map((r) => r.payload as unknown as CRMLead | null)
    .filter((l): l is CRMLead => Boolean(l && l.id));
}

export async function upsertMember(member: ChurnRiskMember): Promise<void> {
  if (!isDatabaseConfigured()) return;
  const tenantId = await resolveTenantId(DEFAULT_TENANT_NAME);
  if (!tenantId) return;

  const row = {
    tenantId,
    fullName: member.fullName,
    email: member.email || null,
    tier: member.tier || null,
    // Catalog is in dollars; stored as integer cents so sums never drift.
    monthlyValueCents: Math.round((member.monthlyFee || 0) * 100),
    riskLevel: member.requiresManagerReview ? 'high' : 'low',
    status: member.status,
    payload: member as unknown as Record<string, unknown>,
    updatedAt: new Date()
  };

  await getDb()
    .insert(churnMembers)
    .values({ id: member.memberId, ...row })
    .onConflictDoUpdate({ target: churnMembers.id, set: row });
}

export async function listAllMembers(): Promise<ChurnRiskMember[]> {
  if (!isDatabaseConfigured()) return [];
  const rows = await getDb().select().from(churnMembers);
  return rows
    .map((r) => r.payload as unknown as ChurnRiskMember | null)
    .filter((m): m is ChurnRiskMember => Boolean(m && m.memberId));
}

// ---------------------------------------------------------------------------
// Third-party platform credentials (encrypted at rest)
// ---------------------------------------------------------------------------

/**
 * The whole platform entry — secrets and metadata — is encrypted as one blob, so
 * nothing about a customer's connection is readable without MASTER_KEY. The
 * accountHandle and autoPublishEnabled columns are duplicated in the clear only
 * because they are needed for querying and are not secret.
 */
export async function upsertPlatformCredential(
  companyName: string,
  platform: string,
  entry: PlatformCredentials
): Promise<void> {
  if (!isDatabaseConfigured()) return;
  if (!isEncryptionConfigured()) {
    // Refuse rather than fall back to plaintext. A database full of readable
    // OAuth tokens is the exact problem this table exists to fix.
    throw new Error('MASTER_KEY is not set; refusing to store credentials unencrypted.');
  }

  const tenantId = await resolveTenantId(companyName);
  if (!tenantId) return;

  const sealed = encryptJson(entry);
  const row = {
    accountHandle: entry.accountHandle || null,
    autoPublishEnabled: Boolean(entry.autoPublishEnabled),
    ciphertext: sealed.ciphertext,
    iv: sealed.iv,
    authTag: sealed.authTag,
    wrappedDek: sealed.wrappedDek,
    keyVersion: sealed.keyVersion,
    updatedAt: new Date()
  };

  await getDb()
    .insert(platformCredentials)
    .values({ tenantId, platform, ...row })
    .onConflictDoUpdate({
      target: [platformCredentials.tenantId, platformCredentials.platform],
      set: row
    });
}

export async function deletePlatformCredential(companyName: string, platform: string): Promise<void> {
  if (!isDatabaseConfigured()) return;
  const tenantId = await resolveTenantId(companyName);
  if (!tenantId) return;
  await getDb()
    .delete(platformCredentials)
    .where(and(eq(platformCredentials.tenantId, tenantId), eq(platformCredentials.platform, platform)));
}

/**
 * Every stored credential, decrypted, with the owning company's name. A row that
 * fails to decrypt (wrong MASTER_KEY, tampered ciphertext) is skipped and logged
 * rather than crashing boot or being returned as garbage.
 */
export async function listAllPlatformCredentials(): Promise<
  Array<{ tenantId: string; companyName: string; platform: string; entry: PlatformCredentials }>
> {
  if (!isDatabaseConfigured() || !isEncryptionConfigured()) return [];

  const rows = await getDb()
    .select({
      tenantId: platformCredentials.tenantId,
      platform: platformCredentials.platform,
      ciphertext: platformCredentials.ciphertext,
      iv: platformCredentials.iv,
      authTag: platformCredentials.authTag,
      wrappedDek: platformCredentials.wrappedDek,
      keyVersion: platformCredentials.keyVersion,
      companyName: organizations.name
    })
    .from(platformCredentials)
    .innerJoin(organizations, eq(platformCredentials.tenantId, organizations.id));

  const out: Array<{ tenantId: string; companyName: string; platform: string; entry: PlatformCredentials }> = [];
  for (const r of rows) {
    try {
      const entry = decryptJson<PlatformCredentials>(r);
      out.push({ tenantId: r.tenantId, companyName: r.companyName, platform: r.platform, entry });
    } catch (err: any) {
      console.error(`[Credentials] Could not decrypt ${r.platform} for tenant ${r.tenantId}; skipping.`, err?.message);
    }
  }
  return out;
}
