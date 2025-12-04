import { Elysia, t } from 'elysia'
import { db } from '../db'
import { users, participants, tournaments } from '../db/schema'
import { eq, desc, sql } from 'drizzle-orm'

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
    // Fetch all participations for this user
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
    .where(eq(participants.userId, parseInt(params.id)))
    .orderBy(desc(tournaments.startDate))
    .all()

    const history = await Promise.all(userParticipations.map(async (p) => {
      // For each tournament, calculate rank
      // This is a bit expensive, but simplest for now. 
      // Optimization: Store rank in participants table or calculate only when needed.
      
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

      const rank = allParticipants.findIndex(ap => ap.userId === parseInt(params.id)) + 1

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

    return { history }
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
