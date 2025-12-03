import { db } from '../db'
import { participants, matches } from '../db/schema'
import { eq, and, desc } from 'drizzle-orm'

export async function generatePairings(tournamentId: number, roundNumber: number) {
  // Get all participants sorted by score
  const players = await db.select()
    .from(participants)
    .where(and(eq(participants.tournamentId, tournamentId), eq(participants.dropped, false)))
    .orderBy(desc(participants.score))
    .all()

  if (players.length < 2) {
    throw new Error('Not enough players to generate pairings')
  }

  const pairings: { player1Id: number, player2Id: number | null }[] = []
  const usedParticipantIds = new Set<number>()

  // Basic pairing logic: Pair adjacent players in sorted list
  // TODO: Implement complex Swiss logic (avoid repeats, color balance, etc.)
  
  for (let i = 0; i < players.length; i++) {
    if (usedParticipantIds.has(players[i].id)) continue

    const player1 = players[i]
    usedParticipantIds.add(player1.id)

    let player2 = null
    
    // Find next available player
    for (let j = i + 1; j < players.length; j++) {
      if (!usedParticipantIds.has(players[j].id)) {
        player2 = players[j]
        break
      }
    }

    if (player2) {
      usedParticipantIds.add(player2.id)
      pairings.push({ player1Id: player1.id, player2Id: player2.id })
    } else {
      // Bye
      pairings.push({ player1Id: player1.id, player2Id: null })
    }
  }

  // Save matches
  for (const pairing of pairings) {
    await db.insert(matches).values({
      tournamentId,
      roundNumber,
      player1Id: pairing.player1Id,
      player2Id: pairing.player2Id,
      isBye: pairing.player2Id === null,
      result: null
    }).run()
  }

  return pairings
}
