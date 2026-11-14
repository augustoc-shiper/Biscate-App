import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,

  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const roleEnum = pgEnum('user_role', ['client', 'professional']);
export const requestStatusEnum = pgEnum('request_status', [
  'open',
  'in_conversation',
  'done',
]);
export const offerStatusEnum = pgEnum('offer_status', [
  'sent',
  'accepted',
  'declined',
]);
export const messageKindEnum = pgEnum('message_kind', [
  'text',
  'image',
  'quote',
  'rating',
]);
export const paymentStatusEnum = pgEnum('payment_status', [
  'pending',
  'confirmed',
]);

export const users = pgTable('users', {
  id: text('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: roleEnum('role').notNull().default('client'),
  phone: text('phone'),
  bio: text('bio'),
  avatarUrl: text('avatar_url'),
  verified: boolean('verified').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const categories = pgTable('categories', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
  name: text('name').notNull().unique(),
  icon: text('icon').notNull(),
});

export const bairro = pgTable('bairro', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
  name: text('name').notNull().unique(),
});

export const professionalProfiles = pgTable(
  'professional_profiles',
  {
    userId: text('user_id')
      .primaryKey()
      .references(() => users.id, { onDelete: 'cascade' }),
    categoryId: integer('category_id').references(() => categories.id),
    bairroId: integer('bairro_id').references(() => bairro.id),
    priceText: text('price_text'),
    priceMin: integer('price_min'),
    responseTime: text('response_time'),
    availableToday: boolean('available_today').notNull().default(false),
    planExpiresAt: timestamp('plan_expires_at', { withTimezone: true }),
    ratingAvg: real('rating_avg').notNull().default(0),
    ratingCount: integer('rating_count').notNull().default(0),
    visitsCount: integer('visits_count').notNull().default(0),
    distanceKm: integer('distance_km').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index('professional_profiles_category_idx').on(t.categoryId),
    index('professional_profiles_bairro_idx').on(t.bairroId),
  ],
);

export const workPhotos = pgTable('work_photos', {
  id: text('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  professionalId: text('professional_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const favorites = pgTable(
  'favorites',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    professionalId: text('professional_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.userId, t.professionalId] })],
);

export const requests = pgTable(
  'requests',
  {
    id: text('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    clientId: text('client_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    categoryId: integer('category_id').references(() => categories.id),
    description: text('description').notNull(),
    bairroId: integer('bairro_id').references(() => bairro.id),
    when: text('when_needed').notNull().default('flexible'),
    status: requestStatusEnum('status').notNull().default('open'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [index('requests_client_idx').on(t.clientId)],
);

export const offers = pgTable('offers', {
  id: text('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  requestId: text('request_id')
    .notNull()
    .references(() => requests.id, { onDelete: 'cascade' }),
  professionalId: text('professional_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  price: integer('price').notNull(),
  message: text('message').notNull(),
  status: offerStatusEnum('status').notNull().default('sent'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const conversations = pgTable(
  'conversations',
  {
    id: text('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    clientId: text('client_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    professionalId: text('professional_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    lastMessageAt: timestamp('last_message_at', {
      withTimezone: true,
    }).defaultNow(),
  },
  (t) => [uniqueIndex('conversations_pair_idx').on(t.clientId, t.professionalId)],
);

export const messages = pgTable(
  'messages',
  {
    id: text('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    conversationId: text('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    senderId: text('sender_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    body: text('body'),
    kind: messageKindEnum('kind').notNull().default('text'),
    payload: jsonb('payload'),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [
    index('messages_conversation_idx').on(t.conversationId, t.createdAt),
  ],
);

export const reviews = pgTable(
  'reviews',
  {
    id: text('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    conversationId: text('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    reviewerId: text('reviewer_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    reviewedId: text('reviewed_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    stars: integer('stars').notNull(),
    comment: text('comment'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [
    uniqueIndex('reviews_one_per_conversation').on(t.conversationId, t.reviewerId),
    check('reviews_stars_range', sql`${t.stars} between 1 and 5`),
  ],
);

export const plans = pgTable('plans', {
  id: integer('id').primaryKey().generatedByDefaultAsIdentity(),
  days: integer('days').notNull(),
  priceKz: integer('price_kz').notNull(),
  name: text('name').notNull(),
  highlight: boolean('highlight').notNull().default(false),
});

export const payments = pgTable('payments', {
  id: text('id')
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  professionalId: text('professional_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  planId: integer('plan_id')
    .notNull()
    .references(() => plans.id),
  entity: text('entity').notNull(),
  reference: text('reference').notNull(),
  amountKz: integer('amount_kz').notNull(),
  status: paymentStatusEnum('status').notNull().default('pending'),
  confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const notifications = pgTable(
  'notifications',
  {
    id: text('id')
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(),
    body: text('body').notNull(),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (t) => [index('notifications_user_idx').on(t.userId)],
);

export type User = typeof users.$inferSelect;
export type ProfessionalProfile = typeof professionalProfiles.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
