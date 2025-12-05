import { Elysia, t } from 'elysia'
import { db } from '../db'
import { duelRooms, users } from '../db/schema'
import { eq, and, or, desc, aliasedTable } from 'drizzle-orm'

export const duelRoutes = new Elysia({ prefix: '/duels' })
  .get('/', async ({ query }) => {
    const { admin, requesterId } = query
    
    let showAll = false
    if (admin === 'true' && requesterId) {
      const requester = await db.select().from(users).where(eq(users.id, parseInt(requesterId))).get()
      if (requester && requester.role === 'admin') {
        showAll = true
      }
    }

    const p2 = aliasedTable(users, 'p2')

    const queryBuilder = db.select({
      id: duelRooms.id,
      name: duelRooms.name,
      status: duelRooms.status,
      player1Id: duelRooms.player1Id,
      player2Id: duelRooms.player2Id,
      winnerId: duelRooms.winnerId,
      result: duelRooms.result,
      createdAt: duelRooms.createdAt,
      player1Name: users.username,
      player1DisplayName: users.displayName,
      player1Avatar: users.avatarUrl,
      player1Color: users.color,
      player2Name: p2.username,
      player2DisplayName: p2.displayName,
      player2Avatar: p2.avatarUrl,
      player2Color: p2.color,
      player1Note: duelRooms.player1Note,
      player2Note: duelRooms.player2Note,
    })
    .from(duelRooms)
    .leftJoin(users, eq(duelRooms.player1Id, users.id))
    .leftJoin(p2, eq(duelRooms.player2Id, p2.id))
    .orderBy(desc(duelRooms.createdAt))

    if (!showAll) {
      // @ts-ignore
      queryBuilder.where(or(eq(duelRooms.status, 'open'), eq(duelRooms.status, 'ready'), eq(duelRooms.status, 'active')))
    }

    return await queryBuilder.all()
  }, {
    query: t.Object({
      admin: t.Optional(t.String()),
      requesterId: t.Optional(t.String())
    })
  })
  .post('/', async ({ body, set }) => {
    const { name, createdBy, player1Id, player2Id, player1Note, player2Note } = body
    
    try {
      const result = await db.insert(duelRooms).values({
        name,
        player1Id: player1Id || createdBy,
        player2Id: player2Id || null,
        status: player2Id ? 'ready' : 'open',
        player1Note,
        player2Note,
      }).returning().get()
      
      return { duel: result }
    } catch (e) {
      console.error('Failed to create duel:', e)
      set.status = 500
      return { error: 'Failed to create duel' }
    }
  }, {
    body: t.Object({
      name: t.String(),
      createdBy: t.Number(),
      player1Id: t.Optional(t.Number()),
      player2Id: t.Optional(t.Nullable(t.Number())),
      player1Note: t.Optional(t.Nullable(t.String())),
      player2Note: t.Optional(t.Nullable(t.String()))
    })
  })
  .get('/:id', async ({ params, set }) => {
    const id = parseInt(params.id)
    const duel = await db.select().from(duelRooms).where(eq(duelRooms.id, id)).get()
    
    if (!duel) {
      set.status = 404
      return { error: 'Duel not found' }
    }

    // Fetch player details
    const p1 = await db.select().from(users).where(eq(users.id, duel.player1Id)).get()
    const p2 = duel.player2Id ? await db.select().from(users).where(eq(users.id, duel.player2Id)).get() : null

    return { 
      duel: {
        ...duel,
        player1: p1 ? { id: p1.id, username: p1.username, displayName: p1.displayName, avatarUrl: p1.avatarUrl, color: p1.color, mmr: p1.mmr } : null,
        player2: p2 ? { id: p2.id, username: p2.username, displayName: p2.displayName, avatarUrl: p2.avatarUrl, color: p2.color, mmr: p2.mmr } : null,
      }
    }
  }, {
    params: t.Object({ id: t.String() })
  })
  .post('/:id/join', async ({ params, body, set }) => {
    const id = parseInt(params.id)
    const { userId } = body

    const duel = await db.select().from(duelRooms).where(eq(duelRooms.id, id)).get()
    if (!duel) {
      set.status = 404
      return { error: 'Duel not found' }
    }
    if (duel.status !== 'open') {
      set.status = 400
      return { error: 'Duel is not open' }
    }
    if (duel.player1Id === userId) {
      set.status = 400
      return { error: 'Cannot join your own duel' }
    }
    if (duel.player2Id) {
      set.status = 400
      return { error: 'Room is full' }
    }

    await db.update(duelRooms)
      .set({ player2Id: userId, status: 'ready' })
      .where(eq(duelRooms.id, id))
      .run()

    return { success: true }
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({ userId: t.Number() })
  })
  .post('/:id/leave', async ({ params, body, set }) => {
    const id = parseInt(params.id)
    const { userId } = body

    const duel = await db.select().from(duelRooms).where(eq(duelRooms.id, id)).get()
    if (!duel) {
      set.status = 404
      return { error: 'Duel not found' }
    }
    if (duel.status !== 'ready') {
      set.status = 400
      return { error: 'Cannot leave now' }
    }
    if (duel.player2Id !== userId) {
      set.status = 403
      return { error: 'Unauthorized' }
    }

    await db.update(duelRooms)
      .set({ player2Id: null, status: 'open' })
      .where(eq(duelRooms.id, id))
      .run()

    return { success: true }
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({ userId: t.Number() })
  })
  .post('/:id/start', async ({ params, body, set }) => {
    const id = parseInt(params.id)
    const { userId } = body

    const duel = await db.select().from(duelRooms).where(eq(duelRooms.id, id)).get()
    if (!duel) {
      set.status = 404
      return { error: 'Duel not found' }
    }
    if (duel.status !== 'ready') {
      set.status = 400
      return { error: 'Duel is not ready' }
    }
    const requester = await db.select().from(users).where(eq(users.id, userId)).get()
    const isAdmin = requester?.role === 'admin'

    if (duel.player1Id !== userId && !isAdmin) {
      set.status = 403
      return { error: 'Unauthorized' }
    }

    await db.update(duelRooms)
      .set({ status: 'active' })
      .where(eq(duelRooms.id, id))
      .run()

    return { success: true }
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({ userId: t.Number() })
  })
  .delete('/:id', async ({ params, body, set }) => {
    const id = parseInt(params.id)
    const { userId } = body

    const duel = await db.select().from(duelRooms).where(eq(duelRooms.id, id)).get()
    if (!duel) {
      set.status = 404
      return { error: 'Duel not found' }
    }

    const requester = await db.select().from(users).where(eq(users.id, userId)).get()
    if (!requester) {
      set.status = 403
      return { error: 'Unauthorized' }
    }

    const isAdmin = requester.role === 'admin'

    if (duel.player1Id !== userId && !isAdmin) {
      set.status = 403
      return { error: 'Unauthorized' }
    }

    if (duel.status === 'active' && !isAdmin) {
       set.status = 400
       return { error: 'Cannot delete active duel' }
    }

    if (duel.status === 'completed' && !isAdmin) {
       set.status = 400
       return { error: 'Cannot delete completed duel (preserved for history)' }
    }

    await db.delete(duelRooms).where(eq(duelRooms.id, id)).run()
    return { success: true }
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({ userId: t.Number() })
  })
  .post('/:id/report', async ({ params, body, set }) => {
    const id = parseInt(params.id)
    const { player1Score, player2Score, reportedBy } = body

    const duel = await db.select().from(duelRooms).where(eq(duelRooms.id, id)).get()
    if (!duel) {
      set.status = 404
      return { error: 'Duel not found' }
    }
    if (duel.status !== 'active') {
      set.status = 400
      return { error: 'Duel is not active' }
    }
    if (duel.player1Id !== reportedBy && duel.player2Id !== reportedBy) {
      set.status = 403
      return { error: 'Unauthorized' }
    }

    const winnerId = player1Score > player2Score ? duel.player1Id : (player2Score > player1Score ? duel.player2Id! : null)
    // For duels, we might not allow draws or handle them as no MMR change? Or small change?
    // Let's assume standard logic.

    await db.update(duelRooms)
      .set({ 
        status: 'completed', 
        result: `${player1Score}-${player2Score}`,
        winnerId
      })
      .where(eq(duelRooms.id, id))
      .run()

    // MMR Update
    if (duel.player1Id && duel.player2Id) {
      const user1 = await db.select().from(users).where(eq(users.id, duel.player1Id)).get()
      const user2 = await db.select().from(users).where(eq(users.id, duel.player2Id)).get()

      if (user1 && user2) {
        const K = 32
        const r1 = user1.mmr
        const r2 = user2.mmr

        const e1 = 1 / (1 + Math.pow(10, (r2 - r1) / 400))
        const e2 = 1 / (1 + Math.pow(10, (r1 - r2) / 400))

        const s1 = player1Score > player2Score ? 1 : (player1Score === player2Score ? 0.5 : 0)
        const s2 = player2Score > player1Score ? 1 : (player1Score === player2Score ? 0.5 : 0)

        const newR1 = Math.round(r1 + K * (s1 - e1))
        const newR2 = Math.round(r2 + K * (s2 - e2))

        await db.update(users).set({ mmr: newR1 }).where(eq(users.id, user1.id)).run()
        await db.update(users).set({ mmr: newR2 }).where(eq(users.id, user2.id)).run()
      }
    }

    return { success: true }
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({ 
      player1Score: t.Number(),
      player2Score: t.Number(),
      reportedBy: t.Number()
    })
  })
  .post('/:id/note', async ({ params, body, set }) => {
    const id = parseInt(params.id)
    const { targetPlayerId, note, userId } = body

    const duel = await db.select().from(duelRooms).where(eq(duelRooms.id, id)).get()
    if (!duel) {
      set.status = 404
      return { error: 'Duel not found' }
    }

    // Check permissions: User must be admin or the target player
    const requester = await db.select().from(users).where(eq(users.id, userId)).get()
    if (!requester) {
      set.status = 403
      return { error: 'Unauthorized' }
    }

    const isAdmin = requester.role === 'admin'
    const isTargetPlayer = targetPlayerId === userId

    if (!isAdmin && !isTargetPlayer) {
      set.status = 403
      return { error: 'Unauthorized' }
    }

    // Determine which note to update
    let updateData: any = {}
    if (duel.player1Id === targetPlayerId) {
      updateData.player1Note = note
    } else if (duel.player2Id === targetPlayerId) {
      updateData.player2Note = note
    } else {
      set.status = 400
      return { error: 'Target player is not in this duel' }
    }

    await db.update(duelRooms)
      .set(updateData)
      .where(eq(duelRooms.id, id))
      .run()

    return { success: true }
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({
      targetPlayerId: t.Number(),
      note: t.String(),
      userId: t.Number()
    })
  })
  .put('/:id/result', async ({ params, body, set }) => {
    const id = parseInt(params.id)
    const { player1Score, player2Score, userId } = body

    const duel = await db.select().from(duelRooms).where(eq(duelRooms.id, id)).get()
    if (!duel) {
      set.status = 404
      return { error: 'Duel not found' }
    }

    const requester = await db.select().from(users).where(eq(users.id, userId)).get()
    if (!requester || requester.role !== 'admin') {
      set.status = 403
      return { error: 'Unauthorized' }
    }

    if (duel.status !== 'completed') {
      set.status = 400
      return { error: 'Duel is not completed' }
    }

    const winnerId = player1Score > player2Score ? duel.player1Id : (player2Score > player1Score ? duel.player2Id! : null)

    await db.update(duelRooms)
      .set({ 
        result: `${player1Score}-${player2Score}`,
        winnerId
      })
      .where(eq(duelRooms.id, id))
      .run()

    return { success: true }
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({
      player1Score: t.Number(),
      player2Score: t.Number(),
      userId: t.Number()
    })
  })
  .put('/:id/admin-update', async ({ params, body, set }) => {
    const id = parseInt(params.id)
    const { player1Score, player2Score, player1Note, player2Note, userId, player1Id, player2Id, status } = body

    const duel = await db.select().from(duelRooms).where(eq(duelRooms.id, id)).get()
    if (!duel) {
      set.status = 404
      return { error: 'Duel not found' }
    }

    const requester = await db.select().from(users).where(eq(users.id, userId)).get()
    console.log('Admin Update Request:', { userId, requester })
    if (!requester || requester.role !== 'admin') {
      // console.log('Unauthorized: Requester role is', requester?.role)
      set.status = 403
      return { error: `Unauthorized: User ${userId} role is ${requester?.role}` }
    }

    let updateData: any = {}
    
    // Update notes if provided
    if (player1Note !== undefined) updateData.player1Note = player1Note
    if (player2Note !== undefined) updateData.player2Note = player2Note

    // Update participants if provided
    if (player1Id !== undefined) updateData.player1Id = player1Id
    if (player2Id !== undefined) updateData.player2Id = player2Id

    // Update status if provided
    if (status !== undefined) updateData.status = status

    // Update result if scores provided and duel is completed (or being set to completed)
    if (player1Score !== undefined && player2Score !== undefined) {
      const currentStatus = status || duel.status
      if (currentStatus === 'completed') {
        const p1 = player1Id || duel.player1Id
        const p2 = player2Id || duel.player2Id
        
        // Ensure p2 exists for a result
        if (p2) {
          const winnerId = player1Score > player2Score ? p1 : (player2Score > player1Score ? p2 : null)
          updateData.result = `${player1Score}-${player2Score}`
          updateData.winnerId = winnerId
        }
      }
    }

    await db.update(duelRooms)
      .set(updateData)
      .where(eq(duelRooms.id, id))
      .run()

    return { success: true }
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({
      player1Score: t.Optional(t.Number()),
      player2Score: t.Optional(t.Number()),
      player1Note: t.Optional(t.String()),
      player2Note: t.Optional(t.String()),
      player1Id: t.Optional(t.Number()),
      player2Id: t.Optional(t.Nullable(t.Number())),
      status: t.Optional(t.String()),
      userId: t.Number()
    })
  })
