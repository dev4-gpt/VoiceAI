import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  uuid,
  index,
  uniqueIndex
} from 'drizzle-orm/pg-core';

/**
 * Postgres schema for GrowthVoice OS.
 *
 * Two rules this schema holds to:
 *
 *  1. Every business table carries `tenant_id` and every index leads with it.
 *     Multi-tenant auth is deferred, so today there is one seeded organization —
 *     but adding the column later means backfilling live data, whereas carrying
 *     it now costs nothing.
 *
 *  2. Money is stored as integer cents. The previous in-memory model used
 *     floats, which silently drift once you sum or prorate them.
 *
 * Derived aggregates are deliberately absent. `minutesUsed`, `pipelineGenerated`
 * and `estimatedRoiMultiplier` were stored fields pretending to be state; they
 * are computed from usage_records at read time instead, so they cannot go stale.
 */

export const organizations = pgTable(
  'organizations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    stripeCustomerId: text('stripe_customer_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (t) => ({
    slugIdx: uniqueIndex('organizations_slug_idx').on(t.slug)
  })
);

export const leads = pgTable(
  'leads',
  {
    id: text('id').primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    fullName: text('full_name').notNull(),
    email: text('email'),
    phone: text('phone'),
    companyName: text('company_name'),
    source: text('source'),
    status: text('status').notNull().default('new'),
    qualificationScore: integer('qualification_score').notNull().default(0),
    scheduledCallTime: timestamp('scheduled_call_time', { withTimezone: true }),
    matchedOffer: text('matched_offer'),
    // Free-form transcript/annotation trail. Array rather than a child table
    // because nothing queries inside it.
    notes: jsonb('notes').$type<string[]>().notNull().default([]),
    payload: jsonb('payload').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (t) => ({
    tenantRecentIdx: index('leads_tenant_updated_idx').on(t.tenantId, t.updatedAt),
    tenantEmailIdx: index('leads_tenant_email_idx').on(t.tenantId, t.email)
  })
);

export const churnMembers = pgTable(
  'churn_members',
  {
    id: text('id').primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    fullName: text('full_name').notNull(),
    email: text('email'),
    tier: text('tier'),
    monthlyValueCents: integer('monthly_value_cents').notNull().default(0),
    riskLevel: text('risk_level').notNull().default('low'),
    status: text('status').notNull().default('active'),
    notes: jsonb('notes').$type<string[]>().notNull().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (t) => ({
    tenantIdx: index('churn_members_tenant_idx').on(t.tenantId, t.riskLevel)
  })
);

export const voiceSessions = pgTable(
  'voice_sessions',
  {
    id: text('id').primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    leadId: text('lead_id'),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    durationSeconds: integer('duration_seconds').notNull().default(0),
    isAfterHours: boolean('is_after_hours').notNull().default(false),
    source: text('source').notNull().default('dashboard'),
    status: text('status').notNull().default('active')
  },
  (t) => ({
    tenantStartedIdx: index('voice_sessions_tenant_started_idx').on(t.tenantId, t.startedAt)
  })
);

/**
 * Append-only usage facts. Every billable event lands here once; the numbers the
 * dashboard shows are SUMs over this table, never a mutable counter.
 */
export const usageRecords = pgTable(
  'usage_records',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    sessionId: text('session_id'),
    kind: text('kind').notNull().default('voice_call'),
    durationSeconds: integer('duration_seconds').notNull().default(0),
    leadCaptured: boolean('lead_captured').notNull().default(false),
    isAfterHours: boolean('is_after_hours').notNull().default(false),
    dealValueCents: integer('deal_value_cents').notNull().default(0),
    periodStart: timestamp('period_start', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (t) => ({
    tenantPeriodIdx: index('usage_records_tenant_period_idx').on(t.tenantId, t.periodStart)
  })
);

export const subscriptions = pgTable(
  'subscriptions',
  {
    tenantId: uuid('tenant_id')
      .primaryKey()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    planId: text('plan_id').notNull().default('starter'),
    billingCycle: text('billing_cycle').notNull().default('monthly'),
    // Mirrors Stripe rather than inventing our own lifecycle.
    status: text('status').notNull().default('inactive'),
    stripeCustomerId: text('stripe_customer_id'),
    stripeSubscriptionId: text('stripe_subscription_id'),
    stripePriceId: text('stripe_price_id'),
    minutesLimit: integer('minutes_limit').notNull().default(0),
    currentPeriodStart: timestamp('current_period_start', { withTimezone: true }),
    currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (t) => ({
    stripeSubIdx: index('subscriptions_stripe_sub_idx').on(t.stripeSubscriptionId)
  })
);

/**
 * Consent evidence. This is what you produce if a regulator or plaintiff asks,
 * so rows are written once and never updated.
 */
export const consentRecords = pgTable(
  'consent_records',
  {
    id: text('id').primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    sessionId: text('session_id').notNull(),
    companyName: text('company_name').notNull(),
    region: text('region').notNull(),
    consentRequirement: text('consent_requirement').notNull(),
    consentMethod: text('consent_method').notNull(),
    disclosureText: text('disclosure_text').notNull(),
    disclosedAt: timestamp('disclosed_at', { withTimezone: true }).notNull(),
    consentGrantedAt: timestamp('consent_granted_at', { withTimezone: true }),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (t) => ({
    tenantCreatedIdx: index('consent_records_tenant_created_idx').on(t.tenantId, t.createdAt),
    sessionIdx: index('consent_records_session_idx').on(t.sessionId)
  })
);

/**
 * Third-party OAuth tokens, encrypted at rest with AES-256-GCM. The plaintext
 * never reaches this table: `ciphertext` holds the encrypted payload, and
 * `wrappedDek` the per-row data key wrapped by MASTER_KEY. `keyVersion` exists
 * so the master key can be rotated without re-encrypting payloads.
 */
export const platformCredentials = pgTable(
  'platform_credentials',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    platform: text('platform').notNull(),
    accountHandle: text('account_handle'),
    ciphertext: text('ciphertext').notNull(),
    iv: text('iv').notNull(),
    authTag: text('auth_tag').notNull(),
    wrappedDek: text('wrapped_dek').notNull(),
    keyVersion: integer('key_version').notNull().default(1),
    autoPublishEnabled: boolean('auto_publish_enabled').notNull().default(false),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (t) => ({
    tenantPlatformIdx: uniqueIndex('platform_credentials_tenant_platform_idx').on(t.tenantId, t.platform)
  })
);

export type Organization = typeof organizations.$inferSelect;
export type Lead = typeof leads.$inferSelect;
export type ChurnMember = typeof churnMembers.$inferSelect;
export type VoiceSession = typeof voiceSessions.$inferSelect;
export type UsageRecord = typeof usageRecords.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type ConsentRecordRow = typeof consentRecords.$inferSelect;
export type PlatformCredentialRow = typeof platformCredentials.$inferSelect;
