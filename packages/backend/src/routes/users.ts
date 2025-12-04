import { Elysia, t } from 'elysia'
import { db } from '../db'
import { users, participants, tournaments, duelRooms } from '../db/schema'
import { eq, desc, sql, or } from 'drizzle-orm'

export const userRoutes = new Elysia({ prefix: '/users' })
  .get('/leaderboard', async () => {
    return await db.select({
      id: users.id,
      username: users.username,
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

    return { user }
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
      // We need to fetch opponent name. This is tricky in a single query with simple joins.
      // Let's just fetch the raw data and process it, or do two joins.
      player1Id: duelRooms.player1Id,
      player2Id: duelRooms.player2Id,
    })
    .from(duelRooms)
    .where(or(eq(duelRooms.player1Id, id), eq(duelRooms.player2Id, id)))
    .orderBy(desc(duelRooms.createdAt))
    .all()

    // Enrich duel history with opponent names
    // To avoid complex SQL, let's just fetch all users involved or do it one by one?
    // Optimization: Fetch all users once or just the ones needed.
    // For now, let's just do a simple map.
    const enrichedDuels = await Promise.all(userDuels.map(async (d) => {
      const opponentId = d.player1Id === id ? d.player2Id : d.player1Id
      let opponentName = 'Unknown'
      if (opponentId) {
        const opponent = await db.select({ username: users.username }).from(users).where(eq(users.id, opponentId)).get()
        if (opponent) opponentName = opponent.username
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
        opponentId
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
    const { requesterId, username, password, role, mmr, color } = body
    
    const requester = await db.select().from(users).where(eq(users.id, requesterId)).get()
    if (!requester || requester.role !== 'admin') {
      set.status = 403
      return { error: 'Forbidden' }
    }

    const updates: any = {}
    if (username) updates.username = username
    if (role) updates.role = role
    if (mmr !== undefined) updates.mmr = mmr
    if (color) updates.color = color
    if (body.avatarUrl !== undefined) updates.avatarUrl = body.avatarUrl
    if (password) {
      updates.passwordHash = await Bun.password.hash(password)
    }

    await db.update(users)
      .set(updates)
      .where(eq(users.id, parseInt(params.id)))
      .run()

    return { success: true }
  }, {
    params: t.Object({
      id: t.String()
    }),
    body: t.Object({
      requesterId: t.Number(),
      username: t.Optional(t.String()),
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

    // Prevent deleting yourself
    if (requester.id === parseInt(params.id)) {
      set.status = 400
      return { error: 'Cannot delete your own account' }
    }

    await db.delete(users).where(eq(users.id, parseInt(params.id))).run()
    return { success: true }
  }, {
    params: t.Object({
      id: t.String()
    }),
    body: t.Object({
      requesterId: t.Number()
    })
  })
