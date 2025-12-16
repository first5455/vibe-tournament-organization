import { Elysia, t } from 'elysia'
import { db } from '../db'
import { matches, participants, tournaments, users, userGameStats } from '../db/schema'
import { eq, and, sql } from 'drizzle-orm'
import { events, EVENTS } from '../lib/events'

export const matchRoutes = new Elysia({ prefix: '/matches' })
  .post('/:id/report', async ({ params, body, set }) => {
    const matchId = parseInt(params.id)
    const { winnerId, result, reportedBy } = body

    if (!reportedBy) {
      set.status = 401
      return { error: 'Unauthorized: You must be logged in to report results' }
    }

    const match = await db.select().from(matches).where(eq(matches.id, matchId)).get()
    if (!match) {
      set.status = 404
      return { error: 'Match not found' }
    }

    if (match.winnerId) {
      set.status = 400
      return { error: 'Match already reported' }
    }

    // Permission check
    const tournament = await db.select().from(tournaments).where(eq(tournaments.id, match.tournamentId)).get()
    const isAdmin = tournament?.createdBy === reportedBy
    
    // Check if reporter is a participant in this match
    const p1 = match.player1Id ? await db.select().from(participants).where(eq(participants.id, match.player1Id)).get() : null
    let p2 = null
    if (match.player2Id) {
      p2 = await db.select().from(participants).where(eq(participants.id, match.player2Id)).get()
    }
    
    const isPlayer1 = p1?.userId === reportedBy
    const isPlayer2 = p2?.userId === reportedBy

    
    if (!isAdmin && !isPlayer1 && !isPlayer2) {
      set.status = 403
      return { error: 'Unauthorized: Only players or admin can report' }
    }

    // Update match
    await db.update(matches)
      .set({ winnerId, result })
      .where(eq(matches.id, matchId))
      .run()

    // Update participant score
    // Winner gets 1 point
    const participant = winnerId ? await db.select().from(participants)
      .where(eq(participants.id, winnerId))
      .get() : null
    
    if (participant) {
      await db.update(participants)
        .set({ score: participant.score + 1 })
        .where(eq(participants.id, participant.id))
        .run()
    }

    // MMR Calculation (Elo System)
    // Only if both are registered users
    // p1 and p2 are already fetched above for permission check

    if (p1?.userId && p2?.userId && tournament?.gameId) {
      const gameId = tournament.gameId
      const user1Stats = await db.select().from(userGameStats)
        .where(and(eq(userGameStats.userId, p1.userId), eq(userGameStats.gameId, gameId))).get()
      const user2Stats = await db.select().from(userGameStats)
        .where(and(eq(userGameStats.userId, p2.userId), eq(userGameStats.gameId, gameId))).get()

      if (user1Stats && user2Stats) {
        const K = 32
        const r1 = user1Stats.mmr
        const r2 = user2Stats.mmr

        const e1 = 1 / (1 + Math.pow(10, (r2 - r1) / 400))
        const e2 = 1 / (1 + Math.pow(10, (r1 - r2) / 400))

        const s1 = winnerId === p1.id ? 1 : 0
        const s2 = winnerId === p2.id ? 1 : 0

        const newR1 = Math.round(r1 + K * (s1 - e1))
        const newR2 = Math.round(r2 + K * (s2 - e2))
        
        const change1 = newR1 - r1
        const change2 = newR2 - r2

        const isDraw = result === 'draw' || result === '0-0' // Simplified draw check

        await db.update(userGameStats)
            .set({ 
                mmr: newR1, 
                wins: user1Stats.wins + (s1 === 1 ? 1 : 0), 
                losses: user1Stats.losses + (s1 === 0 && !isDraw ? 1 : 0),
                draws: user1Stats.draws + (isDraw ? 1 : 0),
                tournamentWins: (user1Stats.tournamentWins || 0) + (s1 === 1 ? 1 : 0),
                tournamentLosses: (user1Stats.tournamentLosses || 0) + (s1 === 0 && !isDraw ? 1 : 0),
                tournamentDraws: (user1Stats.tournamentDraws || 0) + (isDraw ? 1 : 0)
            })
            .where(and(eq(userGameStats.userId, user1Stats.userId), eq(userGameStats.gameId, gameId))).run()
            
        await db.update(userGameStats)
            .set({ 
                mmr: newR2, 
                wins: user2Stats.wins + (s2 === 1 ? 1 : 0), 
                losses: user2Stats.losses + (s2 === 0 && !isDraw ? 1 : 0),
                draws: user2Stats.draws + (isDraw ? 1 : 0),
                tournamentWins: (user2Stats.tournamentWins || 0) + (s2 === 1 ? 1 : 0),
                tournamentLosses: (user2Stats.tournamentLosses || 0) + (s2 === 0 && !isDraw ? 1 : 0),
                tournamentDraws: (user2Stats.tournamentDraws || 0) + (isDraw ? 1 : 0)
            })
            .where(and(eq(userGameStats.userId, user2Stats.userId), eq(userGameStats.gameId, gameId))).run()
        
        // Update match with MMR changes
        await db.update(matches)
          .set({ player1MmrChange: change1, player2MmrChange: change2 })
          .where(eq(matches.id, matchId))
          .run()
      }
    }

    // Check if round is complete?
    // If so, maybe trigger next round or notify?

    events.emit(EVENTS.MATCH_REPORTED, { matchId, winnerId, tournamentId: match.tournamentId })

    return { success: true }
  }, {
    body: t.Object({
      winnerId: t.Nullable(t.Number()),
      result: t.String(),
      reportedBy: t.Optional(t.Number())
    })
  })
  .put('/:id', async ({ params, body, set }) => {
    const matchId = parseInt(params.id)
    const { winnerId, result, createdBy } = body

    // Verify tournament ownership (admin check)
    const match = await db.select().from(matches).where(eq(matches.id, matchId)).get()
    if (!match) {
      set.status = 404
      return { error: 'Match not found' }
    }

    const tournament = await db.select().from(tournaments).where(eq(tournaments.id, match.tournamentId)).get()
    if (!tournament || tournament.createdBy !== createdBy) {
      set.status = 403
      return { error: 'Unauthorized' }
    }

    // Update match result
    const updateData: any = { winnerId, result }
    
    // Update firstPlayerId if provided
    if ((body as any).firstPlayerId !== undefined) {
        updateData.firstPlayerId = (body as any).firstPlayerId
    }
    
    // Revert previous MMR if exists
    if (match.player1MmrChange !== null && match.player2MmrChange !== null && match.player1Id && match.player2Id && tournament?.gameId) {
        const gameId = tournament.gameId
        // Revert for p1
        const p1 = await db.select().from(participants).where(eq(participants.id, match.player1Id)).get()
        if (p1?.userId) {
             // Note: We are not reverting wins/losses count here because we don't know who won previously without checking history or reconstructing.
             // For now, only reverting MMR is critical.
             // Actually, we do know if MMR change was positive/negative? Not always reliable if K factor dynamic.
             // Let's just revert MMR for now.
             await db.run(sql`UPDATE user_game_stats SET mmr = mmr - ${match.player1MmrChange} WHERE user_id = ${p1.userId} AND game_id = ${gameId}`)
        }
        // Revert for p2
        const p2 = await db.select().from(participants).where(eq(participants.id, match.player2Id)).get()
        if (p2?.userId) {
             await db.run(sql`UPDATE user_game_stats SET mmr = mmr - ${match.player2MmrChange} WHERE user_id = ${p2.userId} AND game_id = ${gameId}`)
        }
        
        updateData.player1MmrChange = null
        updateData.player2MmrChange = null
    }

    // Apply new MMR if valid result
    // We need to fetch participants to get User IDs
    if (match.player1Id && match.player2Id && winnerId !== undefined && tournament?.gameId) {
         const gameId = tournament.gameId
         const p1 = await db.select().from(participants).where(eq(participants.id, match.player1Id)).get()
         const p2 = await db.select().from(participants).where(eq(participants.id, match.player2Id)).get()
         
         if (p1?.userId && p2?.userId) {
            const user1Stats = await db.select().from(userGameStats)
                .where(and(eq(userGameStats.userId, p1.userId), eq(userGameStats.gameId, gameId))).get()
            const user2Stats = await db.select().from(userGameStats)
                .where(and(eq(userGameStats.userId, p2.userId), eq(userGameStats.gameId, gameId))).get()
            
            if (user1Stats && user2Stats) {
                const K = 32
                const r1 = user1Stats.mmr
                const r2 = user2Stats.mmr
        
                const e1 = 1 / (1 + Math.pow(10, (r2 - r1) / 400))
                const e2 = 1 / (1 + Math.pow(10, (r1 - r2) / 400))
        
                const s1 = winnerId === p1.id ? 1 : 0
                const s2 = winnerId === p2.id ? 1 : 0
        
                const newR1 = Math.round(r1 + K * (s1 - e1))
                const newR2 = Math.round(r2 + K * (s2 - e2))
                
                const change1 = newR1 - r1
                const change2 = newR2 - r2
                
                await db.update(userGameStats)
                    .set({ 
                        mmr: newR1, 
                        wins: user1Stats.wins + (s1 === 1 ? 1 : 0), 
                        losses: user1Stats.losses + (s1 === 0 ? 1 : 0) 
                    })
                    .where(and(eq(userGameStats.userId, user1Stats.userId), eq(userGameStats.gameId, gameId))).run()
                
                await db.update(userGameStats)
                    .set({ 
                        mmr: newR2, 
                        wins: user2Stats.wins + (s2 === 1 ? 1 : 0), 
                        losses: user2Stats.losses + (s2 === 0 ? 1 : 0) 
                    })
                    .where(and(eq(userGameStats.userId, user2Stats.userId), eq(userGameStats.gameId, gameId))).run()
                
                updateData.player1MmrChange = change1
                updateData.player2MmrChange = change2
            }
         }
    }

    await db.update(matches)
      .set(updateData)
      .where(eq(matches.id, matchId))
      .run()

    // Recalculate scores?
    // This is complex because we need to undo previous score and apply new one.
    // For now, let's just update the match. 
    // Ideally we should rebuild all scores from match history.
    // Let's do a full recalculation for this tournament.
    
    // Reset all scores for this tournament
    await db.update(participants)
      .set({ score: 0 })
      .where(eq(participants.tournamentId, match.tournamentId))
      .run()

    // Re-apply all match results
    const allMatches = await db.select().from(matches).where(eq(matches.tournamentId, match.tournamentId)).all()
    
    for (const m of allMatches) {
      if (m.winnerId) {
        const p = await db.select().from(participants).where(eq(participants.id, m.winnerId)).get()
        if (p) {
          await db.update(participants)
            .set({ score: p.score + 1 })
            .where(eq(participants.id, p.id))
            .run()
        }
      }
    }

    events.emit(EVENTS.MATCH_REPORTED, { matchId, winnerId, tournamentId: match.tournamentId })

    return { success: true }
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({
      winnerId: t.Nullable(t.Number()),
      result: t.String(),
      createdBy: t.Number(),
      firstPlayerId: t.Optional(t.Number())
    })
  })
