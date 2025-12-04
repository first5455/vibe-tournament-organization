import { Elysia, t } from 'elysia'
import { db } from '../db'
import { duelRooms, users } from '../db/schema'
import { eq, and, or, desc } from 'drizzle-orm'

export const duelRoutes = new Elysia({ prefix: '/duels' })
  .get('/', async () => {
    return await db.select({
      id: duelRooms.id,
      name: duelRooms.name,
      status: duelRooms.status,
      player1Id: duelRooms.player1Id,
      player2Id: duelRooms.player2Id,
      winnerId: duelRooms.winnerId,
      result: duelRooms.result,
      createdAt: duelRooms.createdAt,
      player1Name: users.username,
      player1Avatar: users.avatarUrl,
    })
    .from(duelRooms)
    .leftJoin(users, eq(duelRooms.player1Id, users.id))
    .where(or(eq(duelRooms.status, 'open'), eq(duelRooms.status, 'ready'), eq(duelRooms.status, 'active')))
    .orderBy(desc(duelRooms.createdAt))
    .all()
  })
  .post('/', async ({ body, set }) => {
    const { name, createdBy } = body
    
    try {
      const result = await db.insert(duelRooms).values({
        name,
        player1Id: createdBy,
        status: 'open',
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
      createdBy: t.Number()
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
        player1: p1 ? { id: p1.id, username: p1.username, avatarUrl: p1.avatarUrl, color: p1.color, mmr: p1.mmr } : null,
        player2: p2 ? { id: p2.id, username: p2.username, avatarUrl: p2.avatarUrl, color: p2.color, mmr: p2.mmr } : null,
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
    if (duel.player1Id !== userId) {
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
    if (duel.player1Id !== userId) {
      set.status = 403
      return { error: 'Unauthorized' }
    }

    // If active or completed, maybe we shouldn't delete?
    // User said "after match complete then delete room but user can look for history"
    // So we can delete the room but keep the history? 
    // Actually, if we delete the row, we lose history unless we have a separate history table.
    // But our history query queries `duelRooms`.
    // So "delete" for completed rooms should probably just be "hide from dashboard" which is already handled by status check.
    // But if they want to explicitly delete it, maybe we soft delete?
    // For now, let's just delete the row. If they want history, they shouldn't delete it?
    // Wait, "user can look for history for match".
    // If I delete the row, history is gone.
    // Maybe I should add a `deleted` flag?
    // Or maybe "delete room" just means "close it" so it doesn't show up?
    // If status is 'completed', it already doesn't show up in the main list (filtered by open/ready/active).
    // So maybe DELETE is only for cancelling open/ready rooms?
    
    if (duel.status === 'active') {
       set.status = 400
       return { error: 'Cannot delete active duel' }
    }

    if (duel.status === 'completed') {
       // If completed, we probably shouldn't delete the record if we want history.
       // But the user explicitly said "delete room but user can look for history".
       // This implies a soft delete or moving to archive.
       // Let's just NOT delete if completed, maybe just return success?
       // Or maybe we implement soft delete.
       // Let's try to just delete if it's open/ready (cancelling).
       // If completed, we'll tell them it's already done?
       // Re-reading: "after match complete then delete room"
       // This might mean the room *automatically* closes/deletes?
       // "but user can look for history"
       // I'll assume standard behavior: Completed rooms are preserved in DB for history but not shown in lobby.
       // The "Delete" button for owner might be to CANCEL a pending room.
       
       // If they really want to delete a completed room record, they lose history.
       // I will restrict DELETE to open/ready rooms for now to be safe.
       
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
