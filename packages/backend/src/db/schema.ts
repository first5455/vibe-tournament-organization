import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const roles = sqliteTable('roles', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  description: text('description'),
  isSystem: integer('is_system', { mode: 'boolean' }).default(false).notNull(), // Cannot be deleted
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
})

export const permissions = sqliteTable('permissions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  slug: text('slug').notNull().unique(), // e.g. 'users.delete', 'tournaments.create'
  description: text('description'),
})

export const rolePermissions = sqliteTable('role_permissions', {
  roleId: integer('role_id').references(() => roles.id).notNull(),
  permissionId: integer('permission_id').references(() => permissions.id).notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.roleId, t.permissionId] }),
}))

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  displayName: text('display_name'),
  passwordHash: text('password_hash').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  securityQuestion: text('security_question'),
  securityAnswerHash: text('security_answer_hash'),
  roleId: integer('role_id').references(() => roles.id),
  color: text('color').default('#ffffff'),
  avatarUrl: text('avatar_url'),
  tokenVersion: integer('token_version').default(0).notNull(),
})
// Games Table
export const games = sqliteTable('games', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  slug: text('slug').unique(),
  description: text('description'),
  imageUrl: text('image_url'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
})

// User Game Stats (MMR per game)
export const userGameStats = sqliteTable('user_game_stats', {
  userId: integer('user_id').references(() => users.id).notNull(),
  gameId: integer('game_id').references(() => games.id).notNull(),
  mmr: integer('mmr').default(1000).notNull(),
  wins: integer('wins').default(0).notNull(),
  losses: integer('losses').default(0).notNull(),
  draws: integer('draws').default(0).notNull(),
  duelWins: integer('duel_wins').default(0).notNull(),
  duelLosses: integer('duel_losses').default(0).notNull(),
  duelDraws: integer('duel_draws').default(0).notNull(),
  tournamentWins: integer('tournament_wins').default(0).notNull(),
  tournamentLosses: integer('tournament_losses').default(0).notNull(),
  tournamentDraws: integer('tournament_draws').default(0).notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.userId, t.gameId] }),
}))

export const decks = sqliteTable('decks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id).notNull(),
  name: text('name').notNull(),
  link: text('link'),
  color: text('color').default('#ffffff').notNull(),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  gameId: integer('game_id').references(() => games.id),
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
  gameId: integer('game_id').references(() => games.id),
  winnerId: integer('winner_id').references(() => users.id),
})

export const participants = sqliteTable('participants', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tournamentId: integer('tournament_id').references(() => tournaments.id).notNull(),
  userId: integer('user_id').references(() => users.id), // Nullable for guests
  guestName: text('guest_name'), // For guests
  score: integer('score').default(0).notNull(),
  deckId: integer('deck_id').references(() => decks.id),
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
  firstPlayerId: integer('first_player_id').references(() => participants.id), // Reference participant
  isBye: integer('is_bye', { mode: 'boolean' }).default(false).notNull(),
  player1MmrChange: integer('player1_mmr_change'),
  player2MmrChange: integer('player2_mmr_change'),
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
  player1Note: text('player1_note'),
  player2Note: text('player2_note'),
  firstPlayerId: integer('first_player_id').references(() => users.id),
  rematchRoomId: integer('rematch_room_id'),
  player1MmrChange: integer('player1_mmr_change'),
  player2MmrChange: integer('player2_mmr_change'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
  player1DeckId: integer('player1_deck_id').references(() => decks.id),
  player2DeckId: integer('player2_deck_id').references(() => decks.id),
  gameId: integer('game_id').references(() => games.id),
})

export const systemSettings = sqliteTable('system_settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: text('updated_at').default(sql`CURRENT_TIMESTAMP`).notNull(),
})

