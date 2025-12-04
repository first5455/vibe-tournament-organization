import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  mmr: integer('mmr').default(1000).notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  securityQuestion: text('security_question'),
  securityAnswerHash: text('security_answer_hash'),
  role: text('role', { enum: ['user', 'admin'] }).default('user').notNull(),
  color: text('color').default('#ffffff'),
  avatarUrl: text('avatar_url'),
})

export const tournaments = sqliteTable('tournaments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  status: text('status', { enum: ['pending', 'active', 'completed'] }).default('pending').notNull(),
  type: text('type', { enum: ['swiss', 'round_robin'] }).default('swiss').notNull(),
  totalRounds: integer('total_rounds').default(3).notNull(),
  currentRound: integer('current_round').default(0).notNull(),
  createdBy: integer('created_by').references(() => users.id).notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  startDate: text('start_date'),
  endDate: text('end_date'),
})

export const participants = sqliteTable('participants', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tournamentId: integer('tournament_id').references(() => tournaments.id).notNull(),
  userId: integer('user_id').references(() => users.id), // Nullable for guests
  guestName: text('guest_name'), // For guests
  score: integer('score').default(0).notNull(),
  tieBreakers: text('tie_breakers', { mode: 'json' }).$type<{ buchholz: number }>().default({ buchholz: 0 }),
  dropped: integer('dropped', { mode: 'boolean' }).default(false).notNull(),
  note: text('note'),
})

export const matches = sqliteTable('matches', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tournamentId: integer('tournament_id').references(() => tournaments.id).notNull(),
  roundNumber: integer('round_number').notNull(),
  player1Id: integer('player1_id').references(() => participants.id), // Reference participant
  player2Id: integer('player2_id').references(() => participants.id), // Reference participant
  winnerId: integer('winner_id').references(() => participants.id), // Reference participant
  result: text('result'), // e.g. "2-0", "1-1"
  isBye: integer('is_bye', { mode: 'boolean' }).default(false).notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
})

export const duelRooms = sqliteTable('duel_rooms', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  status: text('status', { enum: ['open', 'ready', 'active', 'completed'] }).default('open').notNull(),
  player1Id: integer('player1_id').references(() => users.id).notNull(),
  player2Id: integer('player2_id').references(() => users.id),
  winnerId: integer('winner_id').references(() => users.id),
  result: text('result'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
})
