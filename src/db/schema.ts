import {
  pgTable,
  uuid,
  text,
  timestamp,
  smallint,
  pgEnum,
  unique,
} from 'drizzle-orm/pg-core';

export const appRoleEnum = pgEnum('app_role', ['admin', 'moderator', 'user']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name'),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const userRoles = pgTable(
  'user_roles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: appRoleEnum('role').notNull(),
  },
  (t) => [unique().on(t.userId, t.role)],
);

export const featureRequests = pgTable('feature_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  category: text('category'),
  status: text('status').notNull().default('New'),
  submitterId: uuid('submitter_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const votes = pgTable(
  'votes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    requestId: uuid('request_id')
      .notNull()
      .references(() => featureRequests.id, { onDelete: 'cascade' }),
    voteType: smallint('vote_type').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.userId, t.requestId)],
);

export const comments = pgTable('comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  requestId: uuid('request_id')
    .notNull()
    .references(() => featureRequests.id, { onDelete: 'cascade' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  text: text('text').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
