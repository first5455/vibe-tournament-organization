import { Elysia, t } from 'elysia'
import { db } from '../db'
import { matches, participants, tournaments, users } from '../db/schema'
import { eq, and } from 'drizzle-orm'

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
    const p1 = await db.select().from(participants).where(eq(participants.id, match.player1Id)).get()
    let p2 = null
    if (match.player2Id) {
      p2 = await db.select().from(participants).where(eq(participants.id, match.player2Id)).get()
    }
    
    const isPlayer1 = p1?.userId === reportedBy
    const isPlayer2 = p2?.userId === reportedBy

    console.log('Match Report Debug:', {
      matchId,
      reportedBy,
      tournamentCreator: tournament?.createdBy,
      isAdmin,
      p1UserId: p1?.userId,
      p2UserId: p2?.userId,
      isPlayer1,
      isPlayer2
    })
    
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
    // Winner gets 1 point (simplified)
    // Update participant score
    // Winner gets 1 point
    const participant = await db.select().from(participants)
      .where(eq(participants.id, winnerId))
      .get()
    
    if (participant) {
      await db.update(participants)
        .set({ score: participant.score + 1 })
        .where(eq(participants.id, participant.id))
        .run()
    }

    // MMR Calculation (Elo System)
    // Only if both are registered users
    // p1 and p2 are already fetched above for permission check

    if (p1?.userId && p2?.userId) {
      const user1 = await db.select().from(users).where(eq(users.id, p1.userId)).get()
      const user2 = await db.select().from(users).where(eq(users.id, p2.userId)).get()

      if (user1 && user2) {
        const K = 32
        const r1 = user1.mmr
        const r2 = user2.mmr

        const e1 = 1 / (1 + Math.pow(10, (r2 - r1) / 400))
        const e2 = 1 / (1 + Math.pow(10, (r1 - r2) / 400))

        const s1 = winnerId === p1.id ? 1 : 0
        const s2 = winnerId === p2.id ? 1 : 0

        const newR1 = Math.round(r1 + K * (s1 - e1))
        const newR2 = Math.round(r2 + K * (s2 - e2))

        await db.update(users).set({ mmr: newR1 }).where(eq(users.id, user1.id)).run()
        await db.update(users).set({ mmr: newR2 }).where(eq(users.id, user2.id)).run()
        
        console.log(`MMR Update: ${user1.username} (${r1} -> ${newR1}), ${user2.username} (${r2} -> ${newR2})`)
      }
    }

    // Check if round is complete?
    // If so, maybe trigger next round or notify?

    const { events, EVENTS } = await import('../lib/events')
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
    await db.update(matches)
      .set({ winnerId, result })
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

    const { events, EVENTS } = await import('../lib/events')
    events.emit(EVENTS.MATCH_REPORTED, { matchId, winnerId, tournamentId: match.tournamentId })

    return { success: true }
  }, {
    params: t.Object({ id: t.String() }),
    body: t.Object({
      winnerId: t.Number(),
      result: t.String(),
      createdBy: t.Number()
    })
  })
