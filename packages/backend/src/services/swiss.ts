import { db } from '../db'
import { participants, matches, users, tournaments, userGameStats } from '../db/schema'
import { eq, and, desc, or, isNotNull } from 'drizzle-orm'

interface Player {
  id: number
  userId: number | null
  score: number
  mmr: number
}

interface Pairing {
  player1Id: number
  player2Id: number | null
}

export async function generatePairings(tournamentId: number, roundNumber: number) {
  // Get tournament gameId
  const tournament = await db.select().from(tournaments).where(eq(tournaments.id, tournamentId)).get()
  if (!tournament || !tournament.gameId) {
      throw new Error('Tournament or Game ID not found')
  }
  const gameId = tournament.gameId

  // 1. Get all active participants with their details (Score + MMR for sorting)
  const playersData = await db.select({
    id: participants.id,
    userId: participants.userId,
    score: participants.score,
    mmr: userGameStats.mmr,
    dropped: participants.dropped
  })
  .from(participants)
  .leftJoin(users, eq(participants.userId, users.id)) // Keep users join if needed for something else, or remove if not. Actually we need userId to join userGameStats.
  .leftJoin(userGameStats, and(eq(participants.userId, userGameStats.userId), eq(userGameStats.gameId, gameId)))
  .where(and(
    eq(participants.tournamentId, tournamentId), 
    eq(participants.dropped, false)
  ))
  .orderBy(desc(participants.score), desc(userGameStats.mmr)) 
  .all()

  const players: Player[] = playersData.map(p => ({
    id: p.id,
    userId: p.userId,
    score: p.score,
    mmr: p.mmr || 1000
  }))

  if (players.length < 2) {
    if (players.length === 1) {
       // Only 1 player left? Give them a bye if strictly needed, but usually we need 2 to start.
       // If it's a later round and everyone dropped, maybe end? 
       // For now, let's just giving them a bye if round > 1
       if (roundNumber > 1) {
         await savePairing(tournamentId, roundNumber, { player1Id: players[0].id, player2Id: null })
         return
       }
       throw new Error('Not enough players to generate pairings')
    }
  }

  // 2. Build History (Who played who, Who had a bye)
  const pastMatches = await db.select()
    .from(matches)
    .where(eq(matches.tournamentId, tournamentId))
    .all()

  const playedAgainst = new Map<number, Set<number>>()
  const receivedBye = new Set<number>()

  for (const m of pastMatches) {
    if (m.isBye && m.player1Id) {
      receivedBye.add(m.player1Id)
      continue
    }
    if (m.player1Id && m.player2Id) {
      if (!playedAgainst.has(m.player1Id)) playedAgainst.set(m.player1Id, new Set())
      if (!playedAgainst.has(m.player2Id)) playedAgainst.set(m.player2Id, new Set())
      
      playedAgainst.get(m.player1Id)!.add(m.player2Id)
      playedAgainst.get(m.player2Id)!.add(m.player1Id)
    }
  }

  // 3. Recursive Backtracking Pairing
  const solution = findPairings(players, playedAgainst, receivedBye)

  if (!solution) {
    console.warn('CRITICAL: Could not find valid Swiss pairings without repeats. Falling back to simple adjacent pairing (ignoring repeats).')
    // Fallback: Just pair adjacent players to keep tournament moving
    const fallbackPairings: Pairing[] = []
    const sorted = [...players] // Already sorted
    for (let i = 0; i < sorted.length; i += 2) {
      if (i + 1 < sorted.length) {
        fallbackPairings.push({ player1Id: sorted[i].id, player2Id: sorted[i+1].id })
      } else {
        fallbackPairings.push({ player1Id: sorted[i].id, player2Id: null })
      }
    }
    await savePairings(tournamentId, roundNumber, fallbackPairings)
    return fallbackPairings
  }

  await savePairings(tournamentId, roundNumber, solution)
  return solution
}

function findPairings(
  pool: Player[], 
  playedAgainst: Map<number, Set<number>>, 
  receivedBye: Set<number>
): Pairing[] | null {
  
  // Base case: No players left
  if (pool.length === 0) return []

  // Case: 1 player left (Odd number handling)
  // This should be handled at the root level ideally by picking a bye first, 
  // but if we do it recursively, the last remaining person gets the bye.
  // HOWEVER, we must ensure they haven't had a bye before.
  if (pool.length === 1) {
    const p = pool[0]
    if (receivedBye.has(p.id)) return null // Cannot have bye twice
    return [{ player1Id: p.id, player2Id: null }]
  }

  // Recursive Step
  // If pool is odd, we MUST pick a bye candidate first from this level (or let it bubble down).
  // Standard Swiss: Bye usually goes to the lowest scored player who hasn't had one.
  // We can try to give Bye to players starting from bottom.
  
  if (pool.length % 2 !== 0) {
    // Try giving bye to players from bottom up
    for (let i = pool.length - 1; i >= 0; i--) {
      const p = pool[i]
      if (receivedBye.has(p.id)) continue 

      // Give p a bye
      const remaining = pool.filter((_, idx) => idx !== i)
      const subResult = findPairings(remaining, playedAgainst, receivedBye)
      
      if (subResult) {
        return [...subResult, { player1Id: p.id, player2Id: null }]
      }
    }
    return null // Could not find valid bye assignment
  }

  // Even pool: Pair top player with someone
  const p1 = pool[0]
  
  // Try to pair p1 with p2 (iterating from p1+1 downwards)
  for (let i = 1; i < pool.length; i++) {
    const p2 = pool[i]

    // Constraint: Check history
    const p1History = playedAgainst.get(p1.id)
    if (p1History && p1History.has(p2.id)) continue

    // Valid pair candidate
    const remaining = pool.filter((_, idx) => idx !== 0 && idx !== i)
    const subResult = findPairings(remaining, playedAgainst, receivedBye)

    if (subResult) {
      return [{ player1Id: p1.id, player2Id: p2.id }, ...subResult]
    }
  }

  return null // Backtrack: P1 could not be paired with anyone valid
}

async function savePairings(tournamentId: number, roundNumber: number, pairings: Pairing[]) {
  for (const p of pairings) {
    await db.insert(matches).values({
      tournamentId,
      roundNumber,
      player1Id: p.player1Id,
      player2Id: p.player2Id,
      isBye: p.player2Id === null,
      result: null
    }).run()
  }
}

async function savePairing(tournamentId: number, roundNumber: number, p: Pairing) {
  await db.insert(matches).values({
    tournamentId,
    roundNumber,
    player1Id: p.player1Id,
    player2Id: p.player2Id,
    isBye: p.player2Id === null,
    result: null
  }).run()
}
