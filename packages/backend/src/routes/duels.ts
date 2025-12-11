import { Elysia, t } from 'elysia'
import { db } from '../db'
import { duelRooms, users, decks, games, userGameStats, roles, permissions, rolePermissions } from '../db/schema'
import { eq, and, or, desc, aliasedTable, sql } from 'drizzle-orm'
import { getRank } from '../utils'


export const duelRoutes = new Elysia({ prefix: '/duels' })
  .get('/', async ({ query }) => {
    const { admin, requesterId, gameId } = query
    
    let showAll = false
    if (admin === 'true' && requesterId) {
    let showAll = false
    if (admin === 'true' && requesterId) {
      // Auth check
      const requesterPermissions = await db.select({
        permissionSlug: permissions.slug
      })
      .from(users)
      .leftJoin(roles, eq(users.roleId, roles.id))
      .leftJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
      .leftJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(users.id, parseInt(requesterId)))
      .all()
      
      if (requesterPermissions.some(r => r.permissionSlug === 'admin.access' || r.permissionSlug === 'duels.manage')) {
        showAll = true
      }
    }
    }

    const p2 = aliasedTable(users, 'p2')
    const d1 = aliasedTable(decks, 'd1')
    const d2 = aliasedTable(decks, 'd2')

    const queryBuilder = db.select({
      id: duelRooms.id,
      name: duelRooms.name,
      status: duelRooms.status,
      player1Id: duelRooms.player1Id,
      player2Id: duelRooms.player2Id,
      firstPlayerId: duelRooms.firstPlayerId,
      player1DeckId: duelRooms.player1DeckId,
      player2DeckId: duelRooms.player2DeckId,
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
      player1DeckName: d1.name,
      player1DeckColor: d1.color,
      player1DeckLink: d1.link,
      player2DeckName: d2.name,
      player2DeckColor: d2.color,
      player2DeckLink: d2.link,
      gameName: games.name
    })
    .from(duelRooms)
    .leftJoin(users, eq(duelRooms.player1Id, users.id))
    .leftJoin(p2, eq(duelRooms.player2Id, p2.id))
    .leftJoin(d1, eq(duelRooms.player1DeckId, d1.id))
    .leftJoin(d2, eq(duelRooms.player2DeckId, d2.id))
    .leftJoin(games, eq(duelRooms.gameId, games.id))
    .orderBy(desc(duelRooms.createdAt))

    let conditions: any[] = []

    if (!showAll) {
       conditions.push(or(eq(duelRooms.status, 'open'), eq(duelRooms.status, 'ready'), eq(duelRooms.status, 'active')))
    }

    if (gameId) {
        conditions.push(eq(duelRooms.gameId, parseInt(gameId)))
    }

    if (conditions.length > 0) {
        // @ts-ignore
        queryBuilder.where(and(...conditions))
    }

    return await queryBuilder.all()
  }, {
    query: t.Object({
      admin: t.Optional(t.String()),
      requesterId: t.Optional(t.String()),
      gameId: t.Optional(t.String())
    })
  })
  .post('/', async ({ body, set }) => {
    const { name, createdBy, player1Id, player2Id, player1Note, player2Note, player1DeckId, player2DeckId, gameId } = body
    
    try {
      const result = await db.insert(duelRooms).values({
        name,
        player1Id: player1Id || createdBy,
        player2Id: player2Id || null,
        player1DeckId,
        player2DeckId,
        status: player2Id ? 'ready' : 'open',
        player1Note,
        player2Note,
        gameId
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
      gameId: t.Optional(t.Number()),
      player1Id: t.Optional(t.Number()),
      player2Id: t.Optional(t.Nullable(t.Number())),
      player1Note: t.Optional(t.Nullable(t.String())),
      player2Note: t.Optional(t.Nullable(t.String())),
      player1DeckId: t.Optional(t.Number()),
      player2DeckId: t.Optional(t.Number())
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
    // Fetch player details
    const p1 = await db.select().from(users).where(eq(users.id, duel.player1Id)).get()
    let p1Mmr = 1000
    if (p1 && duel.gameId) {
        const stats = await db.select().from(userGameStats)
            .where(and(eq(userGameStats.userId, p1.id), eq(userGameStats.gameId, duel.gameId))).get()
        if (stats) p1Mmr = stats.mmr
    }
    const p1Rank = p1 ? await getRank(p1Mmr, duel.gameId || undefined) : null
    const p1Deck = duel.player1DeckId ? await db.select().from(decks).where(eq(decks.id, duel.player1DeckId)).get() : null

    const p2 = duel.player2Id ? await db.select().from(users).where(eq(users.id, duel.player2Id)).get() : null
    let p2Mmr = 1000
    if (p2 && duel.gameId) {
        const stats = await db.select().from(userGameStats)
            .where(and(eq(userGameStats.userId, p2.id), eq(userGameStats.gameId, duel.gameId))).get()
        if (stats) p2Mmr = stats.mmr
    }
    const p2Rank = p2 ? await getRank(p2Mmr, duel.gameId || undefined) : null
    const p2Deck = duel.player2DeckId ? await db.select().from(decks).where(eq(decks.id, duel.player2DeckId)).get() : null

    return { 
      duel: {
        ...duel,
        player1: p1 ? { id: p1.id, username: p1.username, displayName: p1.displayName, avatarUrl: p1.avatarUrl, color: p1.color, mmr: p1Mmr, rank: p1Rank, deck: p1Deck } : null,
        player2: p2 ? { id: p2.id, username: p2.username, displayName: p2.displayName, avatarUrl: p2.avatarUrl, color: p2.color, mmr: p2Mmr, rank: p2Rank, deck: p2Deck } : null,
      }
    }
  }, {
    params: t.Object({ id: t.String() })
  })
  .post('/:id/join', async ({ params, body, set }) => {
    const id = parseInt(params.id)
    const { userId, deckId } = body

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
      .set({ player2Id: userId, player2DeckId: deckId, status: 'ready' })
      .where(eq(duelRooms.id, id))
      .run()

    return { success: true }
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({ 
      userId: t.Number(),
      deckId: t.Optional(t.Number())
    })
  })
  .put('/:id/players', async ({ params, body, set }) => {
    const id = parseInt(params.id)
    const { userId, targetUserId, deckId } = body

    const duel = await db.select().from(duelRooms).where(eq(duelRooms.id, id)).get()
    if (!duel) {
      set.status = 404
      return { error: 'Duel not found' }
    }

    // Permission Check
    const requesterPermissions = await db.select({
      permissionSlug: permissions.slug
    })
    .from(users)
    .leftJoin(roles, eq(users.roleId, roles.id))
    .leftJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
    .leftJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(users.id, userId))
    .all()

    const canManage = requesterPermissions.some(r => r.permissionSlug === 'duels.manage')
    
    const targetId = targetUserId || userId
    const isPlayer1 = duel.player1Id === targetId
    const isPlayer2 = duel.player2Id === targetId

    // Authorization
    if (!canManage && userId !== targetId) { // User trying to edit someone else
        set.status = 403
        return { error: 'Unauthorized' }
    }
    
    // Check if requester is part of this duel (if not admin)
    if (!canManage && duel.player1Id !== userId && duel.player2Id !== userId) {
        set.status = 403
        return { error: 'Unauthorized' }
    }

    if (!isPlayer1 && !isPlayer2) {
       set.status = 400
       return { error: 'Target user is not in this duel' }
    }

    if (!canManage && duel.status === 'completed') {
       set.status = 400
       return { error: 'Cannot change deck in completed duel' }
    }

    const updates: any = {}
    if (isPlayer1) updates.player1DeckId = deckId
    if (isPlayer2) updates.player2DeckId = deckId

    await db.update(duelRooms)
      .set(updates)
      .where(eq(duelRooms.id, id))
      .run()

    return { success: true }
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({ 
        userId: t.Number(), // Requester
        targetUserId: t.Optional(t.Number()), // Target 
        deckId: t.Nullable(t.Number())
    })
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
    const requesterPermissions = await db.select({
      permissionSlug: permissions.slug
    })
    .from(users)
    .leftJoin(roles, eq(users.roleId, roles.id))
    .leftJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
    .leftJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(users.id, userId))
    .all()

    const canManage = requesterPermissions.some(r => r.permissionSlug === 'duels.manage')

    if (duel.player1Id !== userId && !canManage) {
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

    const requesterPermissions = await db.select({
      permissionSlug: permissions.slug
    })
    .from(users)
    .leftJoin(roles, eq(users.roleId, roles.id))
    .leftJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
    .leftJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(users.id, userId))
    .all()

    const canManage = requesterPermissions.some(r => r.permissionSlug === 'duels.manage')

    if (duel.player1Id !== userId && !canManage) {
      set.status = 403
      return { error: 'Unauthorized' }
    }

    if (duel.status === 'active' && !canManage) {
       set.status = 400
       return { error: 'Cannot delete active duel' }
    }

    if (duel.status === 'completed' && !canManage) {
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
    // Permission Check
    const reporterPermissions = await db.select({
      permissionSlug: permissions.slug
    })
    .from(users)
    .leftJoin(roles, eq(users.roleId, roles.id))
    .leftJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
    .leftJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(users.id, reportedBy))
    .all()

    const canManage = reporterPermissions.some(r => r.permissionSlug === 'duels.manage')

    if (duel.player1Id !== reportedBy && duel.player2Id !== reportedBy && !canManage) {
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
    if (duel.player1Id && duel.player2Id && duel.gameId) {
      const user1Stats = await db.select().from(userGameStats).where(and(eq(userGameStats.userId, duel.player1Id), eq(userGameStats.gameId, duel.gameId))).get()
      const user2Stats = await db.select().from(userGameStats).where(and(eq(userGameStats.userId, duel.player2Id), eq(userGameStats.gameId, duel.gameId))).get()

      if (user1Stats && user2Stats) {
        const K = 32
        const r1 = user1Stats.mmr
        const r2 = user2Stats.mmr

        const e1 = 1 / (1 + Math.pow(10, (r2 - r1) / 400))
        const e2 = 1 / (1 + Math.pow(10, (r1 - r2) / 400))

        const s1 = player1Score > player2Score ? 1 : 0 // Draw is 0
        const s2 = player2Score > player1Score ? 1 : 0 // Draw is 0

        const newR1 = Math.round(r1 + K * (s1 - e1))
        const newR2 = Math.round(r2 + K * (s2 - e2))
        
        const change1 = newR1 - r1
        const change2 = newR2 - r2

        const isDraw = player1Score === player2Score

        await db.update(userGameStats)
            .set({ 
                mmr: newR1, 
                wins: user1Stats.wins + (s1 === 1 ? 1 : 0),
                losses: user1Stats.losses + (s1 === 0 && !isDraw ? 1 : 0),
                draws: user1Stats.draws + (isDraw ? 1 : 0),
                duelWins: (user1Stats.duelWins || 0) + (s1 === 1 ? 1 : 0),
                duelLosses: (user1Stats.duelLosses || 0) + (s1 === 0 && !isDraw ? 1 : 0),
                duelDraws: (user1Stats.duelDraws || 0) + (isDraw ? 1 : 0)
            })
            .where(and(eq(userGameStats.userId, duel.player1Id), eq(userGameStats.gameId, duel.gameId))).run()

        await db.update(userGameStats)
            .set({ 
                mmr: newR2, 
                wins: user2Stats.wins + (s2 === 1 ? 1 : 0),
                losses: user2Stats.losses + (s2 === 0 && !isDraw ? 1 : 0),
                draws: user2Stats.draws + (isDraw ? 1 : 0),
                duelWins: (user2Stats.duelWins || 0) + (s2 === 1 ? 1 : 0),
                duelLosses: (user2Stats.duelLosses || 0) + (s2 === 0 && !isDraw ? 1 : 0),
                duelDraws: (user2Stats.duelDraws || 0) + (isDraw ? 1 : 0)
             })
            .where(and(eq(userGameStats.userId, duel.player2Id), eq(userGameStats.gameId, duel.gameId))).run()
        
        // Update duel with MMR changes
        await db.update(duelRooms)
          .set({ player1MmrChange: change1, player2MmrChange: change2 })
          .where(eq(duelRooms.id, id))
          .run()
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
    const requesterPermissions = await db.select({
      permissionSlug: permissions.slug
    })
    .from(users)
    .leftJoin(roles, eq(users.roleId, roles.id))
    .leftJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
    .leftJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(users.id, userId))
    .all()

    const canManage = requesterPermissions.some(r => r.permissionSlug === 'duels.manage')
    const isTargetPlayer = targetPlayerId === userId

    if (!canManage && !isTargetPlayer) {
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

    const requesterPermissions = await db.select({
      permissionSlug: permissions.slug
    })
    .from(users)
    .leftJoin(roles, eq(users.roleId, roles.id))
    .leftJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
    .leftJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(users.id, userId))
    .all()
    
    // This route is explicitly for manual result setting by admin
    const canManage = requesterPermissions.some(r => r.permissionSlug === 'duels.manage')

    if (!canManage) {
      set.status = 403
      return { error: 'Unauthorized' }
    }

    if (duel.status !== 'completed') {
      set.status = 400
      return { error: 'Duel is not completed' }
    }

    // Revert previous MMR change if exists
    if (duel.player1MmrChange !== null && duel.player2MmrChange !== null && duel.gameId) {
       await db.run(sql`UPDATE user_game_stats SET mmr = mmr - ${duel.player1MmrChange} WHERE user_id = ${duel.player1Id} AND game_id = ${duel.gameId}`)
       await db.run(sql`UPDATE user_game_stats SET mmr = mmr - ${duel.player2MmrChange} WHERE user_id = ${duel.player2Id} AND game_id = ${duel.gameId}`)
    }

    const winnerId = player1Score > player2Score ? duel.player1Id : (player2Score > player1Score ? duel.player2Id! : null)
    
    // Calculate new MMR
    let change1 = 0
    let change2 = 0
    
    if (duel.player2Id && duel.gameId) {
       const user1Stats = await db.select().from(userGameStats)
            .where(and(eq(userGameStats.userId, duel.player1Id), eq(userGameStats.gameId, duel.gameId))).get()
       const user2Stats = await db.select().from(userGameStats)
            .where(and(eq(userGameStats.userId, duel.player2Id), eq(userGameStats.gameId, duel.gameId))).get()

       if (user1Stats && user2Stats) {
          const K = 32
          const r1 = user1Stats.mmr
          const r2 = user2Stats.mmr

          const e1 = 1 / (1 + Math.pow(10, (r2 - r1) / 400))
          const e2 = 1 / (1 + Math.pow(10, (r1 - r2) / 400))

          const s1 = player1Score > player2Score ? 1 : 0 // Draw (equal) is 0
          const s2 = player2Score > player1Score ? 1 : 0 // Draw (equal) is 0

          const newR1 = Math.round(r1 + K * (s1 - e1))
          const newR2 = Math.round(r2 + K * (s2 - e2))
          
          change1 = newR1 - r1
          change2 = newR2 - r2

          await db.update(userGameStats).set({ mmr: newR1 }).where(and(eq(userGameStats.userId, duel.player1Id), eq(userGameStats.gameId, duel.gameId))).run()
          await db.update(userGameStats).set({ mmr: newR2 }).where(and(eq(userGameStats.userId, duel.player2Id), eq(userGameStats.gameId, duel.gameId))).run()
       }
    }

    await db.update(duelRooms)
      .set({ 
        result: `${player1Score}-${player2Score}`,
        winnerId,
        player1MmrChange: change1,
        player2MmrChange: change2
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

    const requesterPermissions = await db.select({
      permissionSlug: permissions.slug
    })
    .from(users)
    .leftJoin(roles, eq(users.roleId, roles.id))
    .leftJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
    .leftJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(users.id, userId))
    .all()
    
    const canManage = requesterPermissions.some(r => r.permissionSlug === 'duels.manage')

    if (!canManage) {

      set.status = 403
      return { error: 'Unauthorized' }
    }

    let updateData: any = {}
    
    // Update notes if provided
    if (player1Note !== undefined) updateData.player1Note = player1Note
    if (player2Note !== undefined) updateData.player2Note = player2Note

    // Update participants if provided
    if (player1Id !== undefined) updateData.player1Id = player1Id
    if (player2Id !== undefined) updateData.player2Id = player2Id
    if (body.firstPlayerId !== undefined) updateData.firstPlayerId = body.firstPlayerId
    if (body.player1DeckId !== undefined) updateData.player1DeckId = body.player1DeckId
    if (body.player2DeckId !== undefined) updateData.player2DeckId = body.player2DeckId

    // Update status if provided
    if (status !== undefined) updateData.status = status

    // Update result if scores provided and duel is completed (or being set to completed)
    if (player1Score !== undefined && player2Score !== undefined) {
      const currentStatus = status || duel.status
      if (currentStatus === 'completed') {
        const p1Id = player1Id || duel.player1Id
        const p2Id = player2Id || duel.player2Id
        
        // 1. Revert previous MMR change if it exists
        if (duel.player1MmrChange !== null && duel.player2MmrChange !== null && duel.gameId) {
             // Revert by subtracting the change from userGameStats
              await db.run(sql`UPDATE user_game_stats SET mmr = mmr - ${duel.player1MmrChange} WHERE user_id = ${duel.player1Id} AND game_id = ${duel.gameId}`)
              await db.run(sql`UPDATE user_game_stats SET mmr = mmr - ${duel.player2MmrChange} WHERE user_id = ${duel.player2Id} AND game_id = ${duel.gameId}`)
              
              // Clear change in updateData until we recalc
              updateData.player1MmrChange = null
              updateData.player2MmrChange = null
        }

        // Ensure p2 exists for a result
        if (p2Id && duel.gameId) {
          const winnerId = player1Score > player2Score ? p1Id : (player2Score > player1Score ? p2Id : null)
          updateData.result = `${player1Score}-${player2Score}`
          updateData.winnerId = winnerId
          
          // 2. Calculate New MMR
          const user1Stats = await db.select().from(userGameStats)
                .where(and(eq(userGameStats.userId, p1Id), eq(userGameStats.gameId, duel.gameId))).get()
          const user2Stats = await db.select().from(userGameStats)
                .where(and(eq(userGameStats.userId, p2Id), eq(userGameStats.gameId, duel.gameId))).get()

          if (user1Stats && user2Stats) {
            const K = 32
            const r1 = user1Stats.mmr
            const r2 = user2Stats.mmr

            const e1 = 1 / (1 + Math.pow(10, (r2 - r1) / 400))
            const e2 = 1 / (1 + Math.pow(10, (r1 - r2) / 400))

            const s1 = player1Score > player2Score ? 1 : 0
            const s2 = player2Score > player1Score ? 1 : 0

            const newR1 = Math.round(r1 + K * (s1 - e1))
            const newR2 = Math.round(r2 + K * (s2 - e2))
            
            const change1 = newR1 - r1
            const change2 = newR2 - r2
            
            // Apply new MMR
            await db.update(userGameStats).set({ mmr: newR1 }).where(and(eq(userGameStats.userId, p1Id), eq(userGameStats.gameId, duel.gameId))).run()
            await db.update(userGameStats).set({ mmr: newR2 }).where(and(eq(userGameStats.userId, p2Id), eq(userGameStats.gameId, duel.gameId))).run()
            
            updateData.player1MmrChange = change1
            updateData.player2MmrChange = change2
          }
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
      firstPlayerId: t.Optional(t.Number()),
      player1DeckId: t.Optional(t.Nullable(t.Number())),
      player2DeckId: t.Optional(t.Nullable(t.Number())),
      status: t.Optional(t.String()),
      userId: t.Number()
    })
  })
  .post('/:id/rematch', async ({ params, body, set }) => {
    const id = parseInt(params.id)
    const { userId } = body

    const duel = await db.select().from(duelRooms).where(eq(duelRooms.id, id)).get()
    if (!duel) {
      set.status = 404
      return { error: 'Duel not found' }
    }
    
    // Check if rematch already exists
    if (duel.rematchRoomId) {
      return { duel: { id: duel.rematchRoomId } }
    }

    // Determine basic new room name
    // Determine basic new room name based on Thailand time
    const now = new Date()
    const options: Intl.DateTimeFormatOptions = {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }
    
    const parts = new Intl.DateTimeFormat('en-GB', options).formatToParts(now)
    const getPart = (type: Intl.DateTimeFormatPartTypes) => parts.find(p => p.type === type)?.value || '00'
    
    const day = getPart('day')
    const month = getPart('month')
    const year = getPart('year')
    const hours = getPart('hour')
    const minutes = getPart('minute')
    const newName = `${day}-${month}-${year} ${hours}:${minutes}`

    try {
      // Create new duel room
      // We keep the same players in the same slots usually, or maybe swap? 
      // The requirement didn't specify, but typically rematch implies same setup.
      // We will keep same player1 and player2.
      
      const newDuel = await db.insert(duelRooms).values({
        name: newName,
        player1Id: duel.player1Id,
        player2Id: duel.player2Id,
        player1DeckId: duel.player1DeckId,
        player2DeckId: duel.player2DeckId,
        status: 'ready', // Since both players are "in", it implies ready, although maybe just Open until joined?
                         // Actually if we carry over players, they are effectively "in" the room data-wise,
                         // but standard flow might require them to "join" again if we want to be strict.
                         // However, for a seamless rematch, making them participants immediately is better.
                         // Let's stick to the previous frontend logic which seemed to carry them over:
                         // "player1Id: duel.player1Id, player2Id: duel.player2Id"
        player1Note: duel.player1Note,
        player2Note: duel.player2Note,
        gameId: duel.gameId
      }).returning().get()

      // Link old room to new room
      await db.update(duelRooms)
        .set({ rematchRoomId: newDuel.id })
        .where(eq(duelRooms.id, id))
        .run()

      return { duel: newDuel }
    } catch (e) {
      console.error('Failed to create rematch:', e)
      set.status = 500
      return { error: 'Failed to create request' }
    }
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({ userId: t.Number() })
  })
  .put('/:id/first-player', async ({ params, body, set }) => {
    const id = parseInt(params.id)
    const { firstPlayerId, userId } = body

    const duel = await db.select().from(duelRooms).where(eq(duelRooms.id, id)).get()
    if (!duel) {
      set.status = 404
      return { error: 'Duel not found' }
    }

    const requesterPermissions = await db.select({
      permissionSlug: permissions.slug
    })
    .from(users)
    .leftJoin(roles, eq(users.roleId, roles.id))
    .leftJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
    .leftJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(users.id, userId))
    .all()

    const canManage = requesterPermissions.some(r => r.permissionSlug === 'duels.manage')
    const isPlayer1 = duel.player1Id === userId
    const isPlayer2 = duel.player2Id === userId

    if (!canManage && !isPlayer1 && !isPlayer2) {
      set.status = 403
      return { error: 'Unauthorized' }
    }
    
    // Verify firstPlayerId is one of the players (if set)
    if (firstPlayerId && firstPlayerId !== duel.player1Id && firstPlayerId !== duel.player2Id) {
       set.status = 400
       return { error: 'Selected user is not a player in this duel' }
    }

    await db.update(duelRooms)
      .set({ firstPlayerId })
      .where(eq(duelRooms.id, id))
      .run()

    return { success: true }
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({
      firstPlayerId: t.Nullable(t.Number()),
      userId: t.Number()
    })
  })
