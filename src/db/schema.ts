import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  decimal,
  pgEnum,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// --- Enums ---
export const roleEnum = pgEnum('role', ['registered', 'publisher', 'moderator']);
export const authProviderEnum = pgEnum('auth_provider', ['local', 'google', 'facebook']);
export const campaignStatusEnum = pgEnum('campaign_status', ['pending', 'active', 'rejected', 'closed']);
export const paymentProviderEnum = pgEnum('payment_provider', ['wayforpay', 'monobank']);
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'completed', 'failed', 'refunded']);
export const mediaFileTypeEnum = pgEnum('media_file_type', ['photo', 'pdf_proof', 'report']);

// --- Tables ---
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: text('password'), // Nullable for OAuth logins
  role: roleEnum('role').default('registered').notNull(),
  authProvider: authProviderEnum('auth_provider').default('local').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull().unique(),
});

export const campaigns = pgTable('campaigns', {
  id: uuid('id').primaryKey().defaultRandom(),
  publisherId: uuid('publisher_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  categoryId: uuid('category_id')
    .references(() => categories.id, { onDelete: 'restrict' })
    .notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  goalAmount: decimal('goal_amount', { precision: 12, scale: 2 }).notNull(),
  collectedInternal: decimal('collected_internal', { precision: 12, scale: 2 }).default('0').notNull(),
  monoJarUrl: varchar('mono_jar_url', { length: 255 }),
  status: campaignStatusEnum('status').default('pending').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  donorId: uuid('donor_id').references(() => users.id, { onDelete: 'set null' }), // Can be null if anonymous donation is allowed
  campaignId: uuid('campaign_id')
    .references(() => campaigns.id, { onDelete: 'cascade' })
    .notNull(),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  provider: paymentProviderEnum('provider').notNull(),
  status: paymentStatusEnum('status').default('pending').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const badges = pgTable('badges', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  requiredDonationsCount: integer('required_donations_count').notNull(),
});

export const userBadges = pgTable(
  'user_badges',
  {
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    badgeId: uuid('badge_id')
      .references(() => badges.id, { onDelete: 'cascade' })
      .notNull(),
    awardedAt: timestamp('awarded_at').defaultNow().notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.badgeId] }),
  })
);

export const media = pgTable('media', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id')
    .references(() => campaigns.id, { onDelete: 'cascade' })
    .notNull(),
  supabaseUrl: text('supabase_url').notNull(),
  fileType: mediaFileTypeEnum('file_type').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --- Relations ---
export const usersRelations = relations(users, ({ many }) => ({
  campaigns: many(campaigns),
  payments: many(payments),
  userBadges: many(userBadges),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  campaigns: many(campaigns),
}));

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  publisher: one(users, {
    fields: [campaigns.publisherId],
    references: [users.id],
  }),
  category: one(categories, {
    fields: [campaigns.categoryId],
    references: [categories.id],
  }),
  payments: many(payments),
  media: many(media),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  donor: one(users, {
    fields: [payments.donorId],
    references: [users.id],
  }),
  campaign: one(campaigns, {
    fields: [payments.campaignId],
    references: [campaigns.id],
  }),
}));

export const userBadgesRelations = relations(userBadges, ({ one }) => ({
  user: one(users, {
    fields: [userBadges.userId],
    references: [users.id],
  }),
  badge: one(badges, {
    fields: [userBadges.badgeId],
    references: [badges.id],
  }),
}));

export const badgesRelations = relations(badges, ({ many }) => ({
  userBadges: many(userBadges),
}));

export const mediaRelations = relations(media, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [media.campaignId],
    references: [campaigns.id],
  }),
}));
