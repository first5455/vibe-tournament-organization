import { db } from '../db'
import { matches, participants } from '../db/schema'
import { eq, and } from 'drizzle-orm'

export async function generatePairings(tournamentId: number, roundNumber: number) {
  console.log(`Generating Round Robin pairings for tournament ${tournamentId} round ${roundNumber}`)

  const allParticipants = await db.select().from(participants).where(and(
    eq(participants.tournamentId, tournamentId),
    eq(participants.dropped, false)
  )).all()

  if (allParticipants.length < 2) return

  // Round Robin Logic (Circle Method)
  // We need a fixed order of players to generate rounds deterministically or store the schedule.
  // For simplicity, let's generate the schedule on the fly based on round number.
  // To do this correctly without pre-generating all rounds, we need a consistent seed or sort order.
  // Let's sort by ID.
  const sortedParticipants = [...allParticipants].sort((a, b) => a.id - b.id)
  
  const n = sortedParticipants.length
  const isOdd = n % 2 !== 0
  const dummyId = -1
  
  // If odd number of players, add a dummy player for bye
  const players = isOdd ? [...sortedParticipants, { id: dummyId }] : [...sortedParticipants]
  const totalPlayers = players.length
  const numRounds = totalPlayers - 1
  const half = totalPlayers / 2

  // Circle method rotation
  // Fixed player at index 0, others rotate
  // Round 1: 0 vs N-1, 1 vs N-2, ...
  // Round r: Rotate array (r-1) times
  
  // Construct the array for this round
  const currentRoundPlayers = [...players]
  
  // Rotate for (roundNumber - 1) times
  // Keep index 0 fixed
  // Rotate 1 to N-1
  const fixed = currentRoundPlayers[0]
  const rotating = currentRoundPlayers.slice(1)
  
  // Calculate effective rotations
  // Each round rotates the array by 1 position to the right
  const rotations = (roundNumber - 1) % rotating.length
  
  const rotated = [
    ...rotating.slice(rotating.length - rotations),
    ...rotating.slice(0, rotating.length - rotations)
  ]
  
  const finalOrder = [fixed, ...rotated]
  
  console.log(`Round ${roundNumber} order:`, finalOrder.map(p => p.id))

  const pairings = []
  for (let i = 0; i < half; i++) {
    const p1 = finalOrder[i]
    const p2 = finalOrder[totalPlayers - 1 - i]
    
    pairings.push({ p1, p2 })
  }

  // Save matches
  for (const pair of pairings) {
    // If one is dummy, it's a bye
    if (pair.p1.id === dummyId || pair.p2.id === dummyId) {
      const realPlayer = pair.p1.id === dummyId ? pair.p2 : pair.p1
      // Check if bye match already exists (shouldn't if logic is correct)
      
      // Actually, for consistency with Swiss, we might record the bye.
      // But in Round Robin, a bye usually just means no match.
      // Let's record it as a bye match for tracking.
      
      // Wait, 'participants' table doesn't have the dummy player.
      // So we can't reference it in 'matches' table if we use foreign keys.
      // We should insert a match with isBye=true and the real player.
      
      // Check if match already exists
      // (Skipping existence check for brevity, assuming fresh round generation)
      
      await db.insert(matches).values({
        tournamentId,
        roundNumber,
        player1Id: realPlayer.id,
        player2Id: null, // Bye
        winnerId: realPlayer.id, // Auto-win bye
        result: 'Bye',
        isBye: true
      }).run()
      
    } else {
      await db.insert(matches).values({
        tournamentId,
        roundNumber,
        player1Id: pair.p1.id,
        player2Id: pair.p2.id,
        winnerId: null,
        result: null,
        isBye: false
      }).run()
    }
  }
}
