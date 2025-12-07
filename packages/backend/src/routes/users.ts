import { Elysia, t } from 'elysia'
import { db } from '../db'
import { users, participants, tournaments, duelRooms, matches } from '../db/schema'
import { eq, desc, sql, or } from 'drizzle-orm'
import { getRank } from '../utils'


export const userRoutes = new Elysia({ prefix: '/users' })
  .get('/search', async ({ query }) => {
    const { q } = query
    if (!q || q.length < 2) return []

    const searchPattern = `%${q}%`
    return await db.select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .where(or(
      sql`lower(${users.username}) like lower(${searchPattern})`,
      sql`lower(${users.displayName}) like lower(${searchPattern})`
    ))
    .limit(10)
    .all()
  }, {
    query: t.Object({
      q: t.String()
    })
  })
  .post('/', async ({ body, set }) => {
    const { requesterId, username, password, displayName } = body
    
    // Auth check
    const requester = await db.select().from(users).where(eq(users.id, requesterId)).get()
    if (!requester || requester.role !== 'admin') {
      set.status = 403
      return { error: 'Forbidden' }
    }

    // Check existing
    const existing = await db.select().from(users).where(eq(users.username, username)).get()
    if (existing) {
      set.status = 400
      return { error: 'Username already taken' }
    }

    const passwordHash = await Bun.password.hash(password || 'password') // Default password if not provided, though generic
    
    const result = await db.insert(users).values({
      username,
      displayName: displayName || username,
      passwordHash,
      role: 'user', // Default role
      color: '#3f3f46',
      mmr: 1000
    }).returning().get()

    return { user: result }
  }, {
    body: t.Object({
      requesterId: t.Number(),
      username: t.String(),
      password: t.Optional(t.String()),
      displayName: t.Optional(t.String())
    })
  })
  .get('/leaderboard', async () => {
    return await db.select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      mmr: users.mmr,
      color: users.color,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .orderBy(desc(users.mmr))
    .limit(10)
  })
  .get('/:id', async ({ params, set }) => {
    const user = await db.select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      mmr: users.mmr,
      createdAt: users.createdAt,
      role: users.role,
      color: users.color,
      avatarUrl: users.avatarUrl,
    })
    .from(users)
    .where(eq(users.id, parseInt(params.id)))
    .get()

    if (!user) {
      set.status = 404
      return { error: 'User not found' }
    }

    const rank = await getRank(user.mmr)

    return { user: { ...user, rank } }

  }, {
    params: t.Object({
      id: t.String()
    })
  })
  .get('/:id/history', async ({ params, set }) => {
    const id = parseInt(params.id)

    // Fetch tournament history
    const userParticipations = await db.select({
      tournamentId: participants.tournamentId,
      score: participants.score,
      note: participants.note,
      dropped: participants.dropped,
      tournamentName: tournaments.name,
      tournamentStartDate: sql<string>`COALESCE(${tournaments.startDate}, ${tournaments.createdAt})`,
      tournamentStatus: tournaments.status,
    })
    .from(participants)
    .innerJoin(tournaments, eq(participants.tournamentId, tournaments.id))
    .where(eq(participants.userId, id))
    .orderBy(desc(tournaments.startDate))
    .all()

    const history = await Promise.all(userParticipations.map(async (p) => {
      const allParticipants = await db.select({
        userId: participants.userId,
        score: participants.score,
        tieBreakers: participants.tieBreakers,
      })
      .from(participants)
      .where(eq(participants.tournamentId, p.tournamentId))
      .all()

      // Sort participants to find rank
      allParticipants.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score
        // @ts-ignore
        return (b.tieBreakers?.buchholz || 0) - (a.tieBreakers?.buchholz || 0)
      })

      const rank = allParticipants.findIndex(ap => ap.userId === id) + 1

      return {
        tournamentName: p.tournamentName,
        tournamentDate: p.tournamentStartDate,
        status: p.tournamentStatus,
        score: p.score,
        rank,
        totalParticipants: allParticipants.length,
        note: p.note,
      }
    }))

    // Fetch duel history
    const userDuels = await db.select({
      id: duelRooms.id,
      name: duelRooms.name,
      status: duelRooms.status,
      result: duelRooms.result,
      winnerId: duelRooms.winnerId,
      createdAt: duelRooms.createdAt,
      player1Id: duelRooms.player1Id,
      player2Id: duelRooms.player2Id,
      player1Note: duelRooms.player1Note,
      player2Note: duelRooms.player2Note,
    })
    .from(duelRooms)
    .where(or(eq(duelRooms.player1Id, id), eq(duelRooms.player2Id, id)))
    .orderBy(desc(duelRooms.createdAt))
    .all()

    // Enrich duel history with opponent names
    const enrichedDuels = await Promise.all(userDuels.map(async (d) => {
      const opponentId = d.player1Id === id ? d.player2Id : d.player1Id
      let opponentName = 'Unknown'
      if (opponentId) {
        const opponent = await db.select({ username: users.username, displayName: users.displayName }).from(users).where(eq(users.id, opponentId)).get()
        if (opponent) opponentName = opponent.displayName || opponent.username
      } else {
        opponentName = 'Waiting...'
      }

      return {
        id: d.id,
        name: d.name,
        status: d.status,
        result: d.result,
        winnerId: d.winnerId,
        createdAt: d.createdAt,
        opponent: opponentName,
        opponentId,
        player1Id: d.player1Id,
        player2Id: d.player2Id,
        player1Note: d.player1Note,
        player2Note: d.player2Note,
      }
    }))

    return { 
      history,
      duels: enrichedDuels
    }
  }, {
    params: t.Object({
      id: t.String()
    })
  })
  .get('/', async ({ query, set }) => {
    const { requesterId } = query
    if (!requesterId) {
      set.status = 401
      return { error: 'Unauthorized' }
    }

    const requester = await db.select().from(users).where(eq(users.id, parseInt(requesterId))).get()
    if (!requester || requester.role !== 'admin') {
      set.status = 403
      return { error: 'Forbidden' }
    }

    const allUsers = await db.select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      role: users.role,
      mmr: users.mmr,
      createdAt: users.createdAt,
      color: users.color,
      avatarUrl: users.avatarUrl,
    }).from(users).all()

    return { users: allUsers }
  }, {
    query: t.Object({
      requesterId: t.String()
    })
  })
  .put('/:id', async ({ params, body, set }) => {
    const { requesterId, username, displayName, password, role, mmr, color } = body
    
    const requester = await db.select().from(users).where(eq(users.id, requesterId)).get()
    
    // Allow if admin OR if updating self
    const isSelfUpdate = requesterId === parseInt(params.id)
    const isAdmin = requester?.role === 'admin'

    if (!requester || (!isAdmin && !isSelfUpdate)) {
      set.status = 403
      return { error: 'Forbidden' }
    }

    const updates: any = {}
    if (username) updates.username = username
    if (displayName) updates.displayName = displayName
    
    // Only admin can update role and mmr
    if (isAdmin) {
      if (role) updates.role = role
      if (mmr !== undefined) updates.mmr = mmr
    }

    if (color) updates.color = color
    if (body.avatarUrl !== undefined) updates.avatarUrl = body.avatarUrl
    if (password) {
      updates.passwordHash = await Bun.password.hash(password)
    }

    await db.update(users)
      .set(updates)
      .where(eq(users.id, parseInt(params.id)))
      .run()

    const updatedUser = await db.select().from(users).where(eq(users.id, parseInt(params.id))).get()
    return { user: updatedUser }
  }, {
    params: t.Object({
      id: t.String()
    }),
    body: t.Object({
      requesterId: t.Number(),
      username: t.Optional(t.String()),
      displayName: t.Optional(t.String()),
      password: t.Optional(t.String()),
      role: t.Optional(t.String()),
      mmr: t.Optional(t.Number()),
      color: t.Optional(t.String()),
      avatarUrl: t.Optional(t.String())
    })
  })
  .delete('/:id', async ({ params, body, set }) => {
    const { requesterId } = body
    
    const requester = await db.select().from(users).where(eq(users.id, requesterId)).get()
    if (!requester || requester.role !== 'admin') {
      set.status = 403
      return { error: 'Forbidden' }
    }


    const userId = parseInt(params.id)

    // Soft delete: Anonymize the user to preserve history
    await db.update(users)
      .set({
        username: `Deleted User ${userId}`,
        displayName: `Deleted User ${userId}`,
        passwordHash: 'deleted', // Invalidate login
        avatarUrl: null,
        color: '#3f3f46', // Zinc-700 (neutral color)
        role: 'user',
        securityQuestion: null,
        securityAnswerHash: null,
        // We keep MMR and CreatedAt for historical context
      })
      .where(eq(users.id, userId))
      .run()

    return { success: true }
  }, {
    params: t.Object({
      id: t.String()
    }),
    body: t.Object({
      requesterId: t.Number()
    })
  })
