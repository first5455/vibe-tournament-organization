import { Elysia, t } from 'elysia'
import { db } from '../db'
import { tournaments, participants, users, matches, decks, games, userGameStats } from '../db/schema'
import { eq, and, or, isNull, sql, getTableColumns } from 'drizzle-orm'

export const tournamentRoutes = new Elysia({ prefix: '/tournaments' })
  .post('/', async ({ body, set }) => {
    const { name, createdBy, gameId } = body
    
    try {

      const result = await db.insert(tournaments).values({
        name,
        createdBy,
        status: 'pending',
        type: (body as any).type || 'swiss',
        gameId
      }).returning().get()

      return { tournament: result }
    } catch (e) {
      console.error('Failed to create tournament:', e)
      set.status = 500
      return { error: 'Failed to create tournament' }
    }


  }, {
    body: t.Object({
      name: t.String(),
      createdBy: t.Number(),
      type: t.Optional(t.String()),
      gameId: t.Optional(t.Number())
    })
  })
  .get('/', async ({ query }) => {
    const gameId = query.gameId ? parseInt(query.gameId) : undefined

    let conditions = undefined
    if (gameId) {
        conditions = eq(tournaments.gameId, gameId)
    }

    const result = await db.select({
      ...getTableColumns(tournaments),
      participantCount: sql<number>`count(${participants.id})`.mapWith(Number),
      createdByName: users.username,
      createdByDisplayName: users.displayName,
      createdByColor: users.color,
      createdByAvatarUrl: users.avatarUrl,
      gameName: games.name,
      winnerName: sql<string>`winner.username`,
      winnerDisplayName: sql<string>`winner.display_name`,
      winnerAvatarUrl: sql<string>`winner.avatar_url`,
      winnerColor: sql<string>`winner.color`
    })
    .from(tournaments)
    .leftJoin(participants, eq(tournaments.id, participants.tournamentId))
    .leftJoin(users, eq(tournaments.createdBy, users.id))
    .leftJoin(games, eq(tournaments.gameId, games.id))
    .leftJoin(sql`users as winner`, eq(tournaments.winnerId, sql`winner.id`))
    .where(conditions)
    .groupBy(tournaments.id)
    .all()
    
    return result
  }, {
    query: t.Object({
        gameId: t.Optional(t.String())
    })
  })
  .get('/:id', async ({ params, set }) => {
    const id = parseInt(params.id)

    
    if (isNaN(id)) {
      set.status = 400
      return { error: 'Invalid tournament ID' }
    }

    const tournament = await db.select({
      ...getTableColumns(tournaments),
      createdByName: users.username,
      createdByDisplayName: users.displayName,
      createdByColor: users.color,
      createdByAvatarUrl: users.avatarUrl,
      winnerName: sql<string>`winner.username`,
      winnerDisplayName: sql<string>`winner.display_name`,
      winnerAvatarUrl: sql<string>`winner.avatar_url`,
      winnerColor: sql<string>`winner.color`
    })
    .from(tournaments)
    .leftJoin(users, eq(tournaments.createdBy, users.id))
    .leftJoin(sql`users as winner`, eq(tournaments.winnerId, sql`winner.id`))
    .where(eq(tournaments.id, id))
    .get()
    
    if (!tournament) {
      set.status = 404
      return { error: 'Tournament not found' }
    }
    
    return { tournament }
  }, {
    params: t.Object({ id: t.String() })
  })
  .post('/:id/join', async ({ params, body, set }) => {
    const tournamentId = parseInt(params.id)
    const { userId, deckId } = body


    
    // Check if tournament exists and is pending
    const tournament = await db.select().from(tournaments).where(eq(tournaments.id, tournamentId)).get()
    if (!tournament) {
      set.status = 404
      return { error: 'Tournament not found' }
    }
    if (tournament.status !== 'pending') {
      set.status = 400
      return { error: 'Tournament already started or completed' }
    }

    // Check if user already joined
    const existingParticipant = await db.select().from(participants)
      .where(and(
        eq(participants.tournamentId, tournamentId),
        eq(participants.userId, userId)
      ))
      .get()

    if (existingParticipant) {
      set.status = 400
      return { error: 'User already joined this tournament' }
    }

    await db.insert(participants).values({
      tournamentId,
      userId,
      deckId
    }).run()

    return { success: true }
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({ 
      userId: t.Number(),

      deckId: t.Optional(t.Nullable(t.Number()))
    })
  })
  .post('/:id/guests', async ({ params, body, set }) => {
    const tournamentId = parseInt(params.id)
    const { name, createdBy } = body


    const tournament = await db.select().from(tournaments).where(eq(tournaments.id, tournamentId)).get()
    if (!tournament) {
      set.status = 404
      return { error: 'Tournament not found' }
    }
    
    // Simple ownership check
    if (tournament.createdBy !== createdBy) {
      set.status = 403
      return { error: 'Unauthorized' }
    }

    await db.insert(participants).values({
      tournamentId,
      guestName: name,
    }).run()

    return { success: true }
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({ 
      name: t.String(),
      createdBy: t.Number()
    })
  })
  .put('/:id', async ({ params, body, set }) => {
    const id = parseInt(params.id)
    const { name, createdBy } = body

    const tournament = await db.select().from(tournaments).where(eq(tournaments.id, id)).get()
    if (!tournament) {
      set.status = 404
      return { error: 'Tournament not found' }
    }

    if (tournament.createdBy !== createdBy) {
      // Check if admin
      const requester = await db.select().from(users).where(eq(users.id, createdBy)).get()
      if (!requester || requester.role !== 'admin') {
        set.status = 403
        return { error: 'Unauthorized' }
      }
    }

    await db.update(tournaments)
      .set({ name })
      .where(eq(tournaments.id, id))
      .run()

    return { success: true }
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({
      name: t.String(),
      createdBy: t.Number()
    })
  })
  .delete('/:id', async ({ params, body, set }) => {
    const id = parseInt(params.id)
    const { createdBy } = body

    const tournament = await db.select().from(tournaments).where(eq(tournaments.id, id)).get()
    if (!tournament) {
      set.status = 404
      return { error: 'Tournament not found' }
    }

    if (tournament.createdBy !== createdBy) {
      const requester = await db.select().from(users).where(eq(users.id, createdBy)).get()
      if (!requester || requester.role !== 'admin') {
        set.status = 403
        return { error: 'Unauthorized' }
      }
    }

    // Delete related data (cascade manually if needed, but sqlite might handle if configured, or just leave for now)
    // For safety, let's delete participants and matches first
    await db.delete(matches).where(eq(matches.tournamentId, id)).run()
    await db.delete(participants).where(eq(participants.tournamentId, id)).run()
    await db.delete(tournaments).where(eq(tournaments.id, id)).run()

    return { success: true }
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({ createdBy: t.Number() })
  })
  .get('/:id/participants', async ({ params, set }) => {
    const id = parseInt(params.id)
    
    const tournament = await db.select().from(tournaments).where(eq(tournaments.id, id)).get()
    if (!tournament) {
      set.status = 404
      return { error: 'Tournament not found' }
    }

    const result = await db.select({
      ...getTableColumns(participants),
      username: users.username,
      displayName: users.displayName,
      userColor: users.color,
      userAvatarUrl: users.avatarUrl,
      deckName: decks.name,
      deckColor: decks.color,
      deckLink: decks.link
    })
    .from(participants)
    .leftJoin(users, eq(participants.userId, users.id))
    .leftJoin(decks, eq(participants.deckId, decks.id)) // Join with decks
    .where(eq(participants.tournamentId, id))
    .all()

    return result
  }, {
    params: t.Object({ id: t.String() })
  })
  .post('/:id/participants', async ({ params, body, set }) => {
    const tournamentId = parseInt(params.id)
    const { userId, createdBy, deckId } = body

    const tournament = await db.select().from(tournaments).where(eq(tournaments.id, tournamentId)).get()
    if (!tournament) {
      set.status = 404
      return { error: 'Tournament not found' }
    }

    // Auth check (Owner or Admin)
    if (tournament.createdBy !== createdBy) {
      const requester = await db.select().from(users).where(eq(users.id, createdBy)).get()
      if (!requester || requester.role !== 'admin') {
        set.status = 403
        return { error: 'Unauthorized' }
      }
    }

    if (tournament.status !== 'pending') {
      set.status = 400
      return { error: 'Tournament already started or completed' }
    }

    // Check if user already joined
    const existingParticipant = await db.select().from(participants)
      .where(and(
        eq(participants.tournamentId, tournamentId),
        eq(participants.userId, userId)
      ))
      .get()

    if (existingParticipant) {
      set.status = 400
      return { error: 'User already joined this tournament' }
    }

    await db.insert(participants).values({
      tournamentId,
      userId,
      deckId
    }).run()

    return { success: true }
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({ 
      userId: t.Number(),
      createdBy: t.Number(),
      deckId: t.Optional(t.Nullable(t.Number()))
    })
  })
  .delete('/:id/participants/:participantId', async ({ params, body, set }) => {
    const tournamentId = parseInt(params.id)
    const participantId = parseInt(params.participantId)
    const { createdBy } = body

    const tournament = await db.select().from(tournaments).where(eq(tournaments.id, tournamentId)).get()
    if (!tournament) {
      set.status = 404
      return { error: 'Tournament not found' }
    }

    if (tournament.createdBy !== createdBy) {
      const requester = await db.select().from(users).where(eq(users.id, createdBy)).get()
      if (!requester || requester.role !== 'admin') {
        set.status = 403
        return { error: 'Unauthorized' }
      }
    }

    // If tournament is active, maybe we should just drop them? 
    // For now, let's allow delete but warn it might break things if matches exist.
    // Actually, let's just delete. Cascading deletes on matches would be ideal but we'll do manual cleanup.
    
    await db.delete(matches).where(
      or(
        eq(matches.player1Id, participantId),
        eq(matches.player2Id, participantId)
      )
    ).run()

    await db.delete(participants).where(and(
      eq(participants.id, participantId),
      eq(participants.tournamentId, tournamentId)
    )).run()

    return { success: true }
  }, {
    params: t.Object({ id: t.String(), participantId: t.String() }),
    body: t.Object({ createdBy: t.Number() })
  })
  .get('/:id/matches', async ({ params, set }) => {
    const id = parseInt(params.id)
    
    const tournamentMatches = await db.select().from(matches)
      .where(eq(matches.tournamentId, id))
      .orderBy(matches.roundNumber)
      .all()
      
    return tournamentMatches
  }, {
    params: t.Object({ id: t.String() })
  })
  .put('/:id/participants/:participantId/note', async ({ params, body, set }) => {
    const tournamentId = parseInt(params.id)
    const participantId = parseInt(params.participantId)
    const { note, userId } = body

    const tournament = await db.select().from(tournaments).where(eq(tournaments.id, tournamentId)).get()
    if (!tournament) {
      set.status = 404
      return { error: 'Tournament not found' }
    }

    const participant = await db.select().from(participants).where(and(
      eq(participants.id, participantId),
      eq(participants.tournamentId, tournamentId)
    )).get()

    if (!participant) {
      set.status = 404
      return { error: 'Participant not found' }
    }

    // Permission Check
    const isOwner = tournament.createdBy === userId
    const isSelf = participant.userId === userId && userId !== null

    if (!isOwner && !isSelf) {
      set.status = 403
      return { error: 'Unauthorized' }
    }

    await db.update(participants)
      .set({ note })
      .where(eq(participants.id, participantId))
      .run()

    return { success: true }
  }, {
    params: t.Object({ id: t.String(), participantId: t.String() }),
    body: t.Object({ 
      note: t.String(),
      userId: t.Number()
    })
  })
  .put('/:id/participants/:participantId', async ({ params, body, set }) => {
    const tournamentId = parseInt(params.id)
    const participantId = parseInt(params.participantId)
    const { deckId, userId } = body

    const tournament = await db.select().from(tournaments).where(eq(tournaments.id, tournamentId)).get()
    if (!tournament) {
      set.status = 404
      return { error: 'Tournament not found' }
    }

    const participant = await db.select().from(participants).where(and(
      eq(participants.id, participantId),
      eq(participants.tournamentId, tournamentId)
    )).get()

    if (!participant) {
      set.status = 404
      return { error: 'Participant not found' }
    }

    // Permission Check
    const requester = await db.select().from(users).where(eq(users.id, userId)).get()
    const isAdmin = requester?.role === 'admin' || tournament.createdBy === userId
    const isSelf = participant.userId === userId

    if (!isAdmin && !isSelf) {
      set.status = 403
      return { error: 'Unauthorized' }
    }

    // Logic Check
    if (!isAdmin && tournament.status !== 'pending') {
      set.status = 400
      return { error: 'Cannot change deck after tournament has started' }
    }

    await db.update(participants)
      .set({ deckId })
      .where(eq(participants.id, participantId))
      .run()

    return { success: true }
  }, {
    params: t.Object({ id: t.String(), participantId: t.String() }),
    body: t.Object({ 
      deckId: t.Nullable(t.Number()),
      userId: t.Number()
    })
  })
  .post('/:id/start', async ({ params, set }) => {
    const tournamentId = parseInt(params.id)
    const tournament = await db.select().from(tournaments).where(eq(tournaments.id, tournamentId)).get()
    
    if (!tournament) {
      set.status = 404
      return { error: 'Tournament not found' }
    }
    if (tournament.status !== 'pending') {
      set.status = 400
      return { error: 'Tournament already started' }
    }

    // Count participants
    const participantCount = (await db.select().from(participants).where(eq(participants.tournamentId, tournamentId)).all()).length
    
    if (participantCount < 2) {
      set.status = 400
      return { error: 'Need at least 2 participants to start' }
    }

    // Calculate rounds based on type
    let totalRounds = 3
    if (tournament.type === 'round_robin') {
      const isOdd = participantCount % 2 !== 0
      totalRounds = isOdd ? participantCount : participantCount - 1
    } else {
      // Swiss: ceil(log2(n))
      totalRounds = Math.max(1, Math.ceil(Math.log2(participantCount)))
    }

    // Update status to active, current round to 1, and set total rounds
    await db.update(tournaments)
      .set({ 
        status: 'active', 
        currentRound: 1, 
        totalRounds,
        startDate: new Date().toISOString()
      })
      .where(eq(tournaments.id, tournamentId))
      .run()

    // Generate pairings for round 1

    try {
      if (tournament.type === 'round_robin') {
        const { generatePairings } = await import('../services/round_robin')
        // Generate ALL rounds for Round Robin
        for (let r = 1; r <= totalRounds; r++) {
          await generatePairings(tournamentId, r)
        }
      } else {
        const { generatePairings } = await import('../services/swiss')
        await generatePairings(tournamentId, 1)
      }
    } catch (e) {
      console.error('Error generating pairings:', e)
      set.status = 500
      return { error: 'Failed to generate pairings' }
    }

    const { events, EVENTS } = await import('../lib/events')
    events.emit(EVENTS.TOURNAMENT_UPDATED, { tournamentId })

    return { success: true }
  }, {
    params: t.Object({ id: t.String() })
  })
  .post('/:id/next-round', async ({ params, set }) => {
    const tournamentId = parseInt(params.id)
    const tournament = await db.select().from(tournaments).where(eq(tournaments.id, tournamentId)).get()
    
    if (!tournament) {
      set.status = 404
      return { error: 'Tournament not found' }
    }
    if (tournament.status !== 'active') {
      set.status = 400
      return { error: 'Tournament is not active' }
    }
    if (tournament.currentRound >= tournament.totalRounds) {
      set.status = 400
      return { error: 'Tournament already at max rounds' }
    }

    // Auto-resolve unfinished matches as 0-0 draws (loss for both)
    const unfinishedMatches = await db.select().from(matches).where(and(
      eq(matches.tournamentId, tournamentId),
      eq(matches.roundNumber, tournament.currentRound),
      or(
        isNull(matches.result), // Not reported
        // We could also check for partial reports if we had them, but currently result is string
      )
    )).all()

    for (const m of unfinishedMatches) {
      if (m.isBye) continue // Byes are already handled or don't need resolution


      
      // Update match result
      await db.update(matches)
        .set({ result: '0-0', winnerId: null })
        .where(eq(matches.id, m.id))
        .run()

      // MMR Update (Loss for both)
      const p1 = await db.select().from(participants).where(eq(participants.id, m.player1Id!)).get()
      const p2 = await db.select().from(participants).where(eq(participants.id, m.player2Id!)).get()

      if (p1?.userId && p2?.userId && tournament.gameId) {
        const gameId = tournament.gameId
        const user1Stats = await db.select().from(userGameStats).where(and(eq(userGameStats.userId, p1.userId), eq(userGameStats.gameId, gameId))).get()
        const user2Stats = await db.select().from(userGameStats).where(and(eq(userGameStats.userId, p2.userId), eq(userGameStats.gameId, gameId))).get()

        if (user1Stats && user2Stats) {
          const K = 32
          const r1 = user1Stats.mmr
          const r2 = user2Stats.mmr

          const e1 = 1 / (1 + Math.pow(10, (r2 - r1) / 400))
          const e2 = 1 / (1 + Math.pow(10, (r1 - r2) / 400))

          // Both get 0 actual score
          const s1 = 0
          const s2 = 0

          const newR1 = Math.round(r1 + K * (s1 - e1))
          const newR2 = Math.round(r2 + K * (s2 - e2))
          
          const change1 = newR1 - r1
          const change2 = newR2 - r2

          await db.update(userGameStats)
            .set({ 
                mmr: newR1, 
                losses: user1Stats.losses + 1,
                tournamentLosses: (user1Stats.tournamentLosses || 0) + 1
            })
            .where(and(eq(userGameStats.userId, user1Stats.userId), eq(userGameStats.gameId, user1Stats.gameId)))
            .run()
          
          await db.update(userGameStats)
            .set({ 
                mmr: newR2, 
                losses: user2Stats.losses + 1,
                tournamentLosses: (user2Stats.tournamentLosses || 0) + 1
            })
            .where(and(eq(userGameStats.userId, user2Stats.userId), eq(userGameStats.gameId, user2Stats.gameId)))
            .run()
          
          // Store MMR Change
          await db.update(matches)
            .set({ player1MmrChange: change1, player2MmrChange: change2 })
            .where(eq(matches.id, m.id))
            .run()
        }
      }
    }

    const nextRound = tournament.currentRound + 1

    // Update tournament round
    await db.update(tournaments)
      .set({ currentRound: nextRound })
      .where(eq(tournaments.id, tournamentId))
      .run()

    if (unfinishedMatches.length > 0) {
      const { events, EVENTS } = await import('../lib/events')
      events.emit(EVENTS.MATCH_REPORTED, { count: unfinishedMatches.length })
    }

    // Generate pairings
    try {
      if (tournament.type === 'round_robin') {
        const { generatePairings } = await import('../services/round_robin')
        await generatePairings(tournamentId, nextRound)
      } else {
        const { generatePairings } = await import('../services/swiss')
        await generatePairings(tournamentId, nextRound)
      }
    } catch (e) {
      console.error('Error generating pairings:', e)
      set.status = 500
      return { error: 'Failed to generate pairings' }
    }

    const { events, EVENTS } = await import('../lib/events')
    events.emit(EVENTS.TOURNAMENT_UPDATED, { tournamentId })

    return { success: true }
  }, {
    params: t.Object({ id: t.String() })
  })
  .post('/:id/stop', async ({ params, body, set }) => {
    const tournamentId = parseInt(params.id)
    const { createdBy } = body

    const tournament = await db.select().from(tournaments).where(eq(tournaments.id, tournamentId)).get()
    if (!tournament) {
      set.status = 404
      return { error: 'Tournament not found' }
    }
    if (tournament.createdBy !== createdBy) {
      set.status = 403
      return { error: 'Unauthorized' }
    }

    // Auto-resolve unfinished matches as 0-0 draws
    const unfinishedMatches = await db.select().from(matches).where(and(
      eq(matches.tournamentId, tournamentId),
      or(
        isNull(matches.result),
        eq(matches.result, '')
      )
    )).all()

    for (const m of unfinishedMatches) {
      if (m.isBye) continue


      
      await db.update(matches)
        .set({ result: '0-0', winnerId: null })
        .where(eq(matches.id, m.id))
        .run()

      // MMR Update (Loss for both)
      const p1 = await db.select().from(participants).where(eq(participants.id, m.player1Id!)).get()
      const p2 = await db.select().from(participants).where(eq(participants.id, m.player2Id!)).get()

      if (p1?.userId && p2?.userId && tournament.gameId) {
        const gameId = tournament.gameId
        const user1Stats = await db.select().from(userGameStats).where(and(eq(userGameStats.userId, p1.userId), eq(userGameStats.gameId, gameId))).get()
        const user2Stats = await db.select().from(userGameStats).where(and(eq(userGameStats.userId, p2.userId), eq(userGameStats.gameId, gameId))).get()

        if (user1Stats && user2Stats) {
          const K = 32
          const r1 = user1Stats.mmr
          const r2 = user2Stats.mmr

          const e1 = 1 / (1 + Math.pow(10, (r2 - r1) / 400))
          const e2 = 1 / (1 + Math.pow(10, (r1 - r2) / 400))

          const s1 = 0
          const s2 = 0

          const newR1 = Math.round(r1 + K * (s1 - e1))
          const newR2 = Math.round(r2 + K * (s2 - e2))
          
          const change1 = newR1 - r1
          const change2 = newR2 - r2

          await db.update(userGameStats)
            .set({ mmr: newR1, losses: user1Stats.losses + 1 })
            .where(and(eq(userGameStats.userId, user1Stats.userId), eq(userGameStats.gameId, user1Stats.gameId)))
            .run()
            
          await db.update(userGameStats)
            .set({ mmr: newR2, losses: user2Stats.losses + 1 })
            .where(and(eq(userGameStats.userId, user2Stats.userId), eq(userGameStats.gameId, user2Stats.gameId)))
            .run()
          
          // Store MMR Change
          await db.update(matches)
            .set({ player1MmrChange: change1, player2MmrChange: change2 })
            .where(eq(matches.id, m.id))
            .run()
        }
      }
    }

    // Calculate winner
    const tournamentParticipants = await db.select().from(participants)
      .where(eq(participants.tournamentId, tournamentId))
      .all()
    
    // Sort by score desc, then tiebreakers if implemented (simplified to score for now)
    // Adding rudimentary Tiebreaker sort (Buchholz) if property exists
    tournamentParticipants.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      // Tiebreaker check
      const tbA = (a.tieBreakers as any)?.buchholz || 0
      const tbB = (b.tieBreakers as any)?.buchholz || 0
      return tbB - tbA
    })

    const winner = tournamentParticipants.length > 0 ? tournamentParticipants[0] : null
    // Only set winner if they are a registered user (userId is not null)
    // Guests cannot be "winners" in the DB sense of linking to a user profile, 
    // unless we relax FK or use participants.id. But schema uses users.id. 
    // If winner is guest, winnerId will be null.
    const winnerId = winner?.userId || null

    await db.update(tournaments)
      .set({ 
        status: 'completed',
        endDate: new Date().toISOString(),
        winnerId
      })
      .where(eq(tournaments.id, tournamentId))
      .run()

    const { events, EVENTS } = await import('../lib/events')
    events.emit(EVENTS.TOURNAMENT_UPDATED, { tournamentId })

    return { success: true }
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({ createdBy: t.Number() })
  })
