
import { db } from './index'
import { games, users, userGameStats, tournaments, duelRooms, decks, matches, participants } from './schema'
import { eq, isNull, and } from 'drizzle-orm'

export async function migrateGames() {
  console.log('Starting games migration...')

  // 1. Check if Union Arena exists
  const existingGames = await db.select().from(games)
  let unionArenaId: number

  if (existingGames.length === 0) {
    console.log('Creating "Union Arena" game...')
    const result = await db.insert(games).values({
      name: 'Union Arena',
      slug: 'union-arena',
      description: 'The default game.',
    }).returning()
    unionArenaId = result[0].id
  } else {
    unionArenaId = existingGames[0].id
    console.log(`Using existing game: ${existingGames[0].name} (ID: ${unionArenaId})`)
  }

  // 2. Migrate Users to UserGameStats
  const allUsers = await db.select().from(users)
  console.log(`Migrating ${allUsers.length} users to user_game_stats...`)
  
  for (const user of allUsers) {
    // Check if stat exists
    const stats = await db.select().from(userGameStats)
      .where(eq(userGameStats.userId, user.id))
    
    const hasUnionArenaStat = stats.some(s => s.gameId === unionArenaId)

    if (!hasUnionArenaStat) {
      await db.insert(userGameStats).values({
        userId: user.id,
        gameId: unionArenaId,
        mmr: user.mmr, // Preserve existing MMR
        wins: 0, 
        losses: 0,
        draws: 0,
      })
    }
  }

  // 3. Migrate Tournaments
  console.log('Migrating tournaments...')
  await db.update(tournaments)
    .set({ gameId: unionArenaId })
    .where(isNull(tournaments.gameId))

  // 4. Migrate Duel Rooms
  console.log('Migrating duel rooms...')
  await db.update(duelRooms)
    .set({ gameId: unionArenaId })
    .where(isNull(duelRooms.gameId))

  // 5. Migrate Decks
  console.log('Migrating decks...')
  await db.update(decks)
    .set({ gameId: unionArenaId })
    .where(isNull(decks.gameId))

  console.log('Games migration completed successfully.')

  // 6. Populate Split Stats (Wins/Losses/Draws for Duels/Tournaments)
  console.log('Populating split stats...')
  
  // Create a map to store stats: Map<gameId, Map<userId, Stats>>
  type Stats = {
      wins: number, losses: number, draws: number,
      duelWins: number, duelLosses: number, duelDraws: number,
      tourneyWins: number, tourneyLosses: number, tourneyDraws: number
  }
  const userStats = new Map<number, Map<number, Stats>>()

  const getStats = (gameId: number, userId: number) => {
      if (!userStats.has(gameId)) userStats.set(gameId, new Map())
      const gameMap = userStats.get(gameId)!
      if (!gameMap.has(userId)) gameMap.set(userId, { 
          wins: 0, losses: 0, draws: 0,
          duelWins: 0, duelLosses: 0, duelDraws: 0,
          tourneyWins: 0, tourneyLosses: 0, tourneyDraws: 0
      })
      return gameMap.get(userId)!
  }

  // Process Duels
  const allDuels = await db.select().from(duelRooms).where(eq(duelRooms.status, 'completed'))
  for (const duel of allDuels) {
      if (!duel.gameId || !duel.player1Id || !duel.player2Id) continue
      
      const s1 = getStats(duel.gameId, duel.player1Id)
      const s2 = getStats(duel.gameId, duel.player2Id)

      const isDraw = duel.result === 'draw' || (duel.result && duel.result.includes('-') && duel.result.split('-')[0] === duel.result.split('-')[1])
      
      let p1Win = false
      let p2Win = false
      if (!isDraw && duel.winnerId) {
          if (duel.winnerId === duel.player1Id) p1Win = true
          if (duel.winnerId === duel.player2Id) p2Win = true
      } else if (!isDraw && duel.result) {
          // Parse result if winnerId missing
          const parts = duel.result.split('-')
          if (parts.length === 2) {
              const score1 = parseInt(parts[0])
              const score2 = parseInt(parts[1])
              if (!isNaN(score1) && !isNaN(score2)) {
                   if (score1 > score2) p1Win = true
                   else if (score2 > score1) p2Win = true
                   // else draw
              }
          }
      }

      if (isDraw) {
          s1.duelDraws++; s1.draws++
          s2.duelDraws++; s2.draws++
      } else if (p1Win) {
          s1.duelWins++; s1.wins++
          s2.duelLosses++; s2.losses++
      } else if (p2Win) {
          s2.duelWins++; s2.wins++
          s1.duelLosses++; s1.losses++
      }
  }

  // Process Tournament Matches
  const allMatches = await db.select().from(matches)
  
  for (const match of allMatches) {
      // Need to find tournament gameId
      const tournament = await db.select().from(tournaments).where(eq(tournaments.id, match.tournamentId)).get()
      if (!tournament || !tournament.gameId) continue

      if (!match.player1Id || !match.player2Id) continue // Skip unresolved or partial

      // Fetch participants to get userIds
      const p1 = await db.select().from(participants).where(eq(participants.id, match.player1Id)).get()
      const p2 = await db.select().from(participants).where(eq(participants.id, match.player2Id)).get()

      if (!p1?.userId || !p2?.userId) continue

      const s1 = getStats(tournament.gameId, p1.userId)
      const s2 = getStats(tournament.gameId, p2.userId)

      const isDraw = match.result === 'draw' || (match.result && match.result.includes('-') && match.result.split('-')[0] === match.result.split('-')[1])
      
      let p1Win = false
      let p2Win = false
      if (match.winnerId) {
          if (match.winnerId === p1.id) p1Win = true
          if (match.winnerId === p2.id) p2Win = true
      }

      if (isDraw) {
          s1.tourneyDraws++; s1.draws++
          s2.tourneyDraws++; s2.draws++
      } else if (p1Win) {
          s1.tourneyWins++; s1.wins++
          s2.tourneyLosses++; s2.losses++
      } else if (p2Win) {
          s2.tourneyWins++; s2.wins++
          s1.tourneyLosses++; s1.losses++
      }
  }

  // Save to DB
  console.log('Saving stats to DB...')
  for (const [gameId, usersMap] of userStats.entries()) {
      for (const [userId, stats] of usersMap.entries()) {
           await db.update(userGameStats)
               .set({
                   wins: stats.wins,
                   losses: stats.losses,
                   draws: stats.draws,
                   duelWins: stats.duelWins,
                   duelLosses: stats.duelLosses,
                   duelDraws: stats.duelDraws,
                   tournamentWins: stats.tourneyWins,
                   tournamentLosses: stats.tourneyLosses,
                   tournamentDraws: stats.tourneyDraws
               })
               .where(and(eq(userGameStats.userId, userId), eq(userGameStats.gameId, gameId)))
               .run()
      }
  }
  
  console.log('Double Migration check complete.')
}

// Run if called directly
if (import.meta.main) {
  migrateGames()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err)
      process.exit(1)
    })
}
