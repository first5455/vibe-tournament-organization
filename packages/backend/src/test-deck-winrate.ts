// Test script to verify deck winrate calculation
import { db } from './db'
import { decks, participants, matches } from './db/schema'
import { eq, and, or, sql, inArray } from 'drizzle-orm'

async function testDeckWinrate(deckId: number) {
    console.log(`\n=== Testing Deck ID: ${deckId} ===\n`)
    
    // Get deck info
    const deck = await db.select().from(decks).where(eq(decks.id, deckId)).get()
    if (!deck) {
        console.log('Deck not found!')
        return
    }
    console.log(`Deck: ${deck.name} (Owner: ${deck.userId})`)
    
    // Find participants using this deck
    const parts = await db.select().from(participants).where(eq(participants.deckId, deckId)).all()
    console.log(`\nParticipants using this deck: ${parts.length}`)
    parts.forEach(p => {
        console.log(`  - Participant ID ${p.id}: TournamentID ${p.tournamentId}, UserID ${p.userId}`)
    })
    
    const partIds = parts.map(p => p.id)
    
    if (partIds.length === 0) {
        console.log('\nNo participants found with this deck!')
        return
    }
    
    // Find matches
    const tourneyMatches = await db.select()
        .from(matches)
        .where(
            and(
                sql`${matches.winnerId} IS NOT NULL`,
                or(
                    inArray(matches.player1Id, partIds),
                    inArray(matches.player2Id, partIds)
                )
            )
        )
        .all()
    
    console.log(`\nMatches found: ${tourneyMatches.length}`)
    
    let tourneyWins = 0
    let tourneyTotal = 0
    
    for (const m of tourneyMatches) {
        // Skip BYE matches
        if (m.isBye) {
            console.log(`  -> Counted: NO (BYE match)`)
            continue
        }
        
        const isP1 = partIds.includes(m.player1Id!)
        const myPartId = isP1 ? m.player1Id : m.player2Id
        const isWinner = m.winnerId === myPartId
        
        console.log(`  Match ${m.id}: P1=${m.player1Id} vs P2=${m.player2Id}, Winner=${m.winnerId}`)
        console.log(`    -> My participant: ${myPartId}, isWinner: ${isWinner}`)
        
        tourneyTotal++
        if (isWinner) tourneyWins++
    }
    
    console.log(`\nResults: ${tourneyWins} wins out of ${tourneyTotal} matches`)
    console.log(`Winrate: ${tourneyTotal > 0 ? Math.round((tourneyWins / tourneyTotal) * 100) : 0}%`)
}

// Test with a specific deck ID
const testDeckId = parseInt(process.argv[2] || '1')
testDeckWinrate(testDeckId).catch(console.error)
