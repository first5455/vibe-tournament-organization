// Script to find and debug specific deck by name
import { db } from './db'
import { decks, participants, matches, duelRooms, users } from './db/schema'
import { eq, and, or, sql, inArray, like } from 'drizzle-orm'

async function debugDeck(deckName: string) {
    console.log(`\n=== Debugging Deck: "${deckName}" ===\n`)
    
    // Find deck
    const deck = await db.select().from(decks).where(like(decks.name, `%${deckName}%`)).get()
    if (!deck) {
        console.log('Deck not found!')
        return
    }
    
    console.log(`Found Deck: ${deck.name} (ID: ${deck.id}, Owner: ${deck.userId})`)
    
    // Get owner info
    const owner = await db.select().from(users).where(eq(users.id, deck.userId)).get()
    console.log(`Owner: ${owner?.username} (${owner?.displayName})`)
    
    // Find all participants using this deck
    const parts = await db.select().from(participants).where(eq(participants.deckId, deck.id)).all()
    console.log(`\nParticipants using this deck: ${parts.length}`)
    
    for (const p of parts) {
        console.log(`  Participant ${p.id}: Tournament ${p.tournamentId}, User ${p.userId}`)
    }
    
    const partIds = parts.map(p => p.id)
    
    if (partIds.length === 0) {
        console.log('\nNo participants found!')
        return
    }
    
    // Find tournament matches
    console.log(`\n--- TOURNAMENT MATCHES ---`)
    const tourneyMatches = await db.select()
        .from(matches)
        .where(
            or(
                inArray(matches.player1Id, partIds),
                inArray(matches.player2Id, partIds)
            )
        )
        .all()
    
    console.log(`Total tournament matches: ${tourneyMatches.length}`)
    
    let tourneyWins = 0
    let tourneyTotal = 0
    
    for (const m of tourneyMatches) {
        const isP1 = partIds.includes(m.player1Id!)
        const myPlayerId = isP1 ? m.player1Id : m.player2Id
        
        console.log(`\nMatch ${m.id} (Round ${m.roundNumber}):`)
        console.log(`  Player1: ${m.player1Id} | Player2: ${m.player2Id}`)
        console.log(`  Winner: ${m.winnerId} | Result: ${m.result}`)
        console.log(`  My participant: ${myPlayerId}`)
        
        // Skip BYE matches - they shouldn't count in winrate
        if (m.isBye) {
            console.log(`  -> Counted: NO (BYE match - skipped)`)
            continue
        }
        
        if (m.winnerId !== null) {
            tourneyTotal++
            const isWinner = m.winnerId === myPlayerId
            console.log(`  -> Counted: YES, Win: ${isWinner}`)
            if (isWinner) tourneyWins++
        } else {
            console.log(`  -> Counted: NO (no winner reported)`)
        }
    }
    
    // Find duel matches
    console.log(`\n--- DUEL ROOM MATCHES ---`)
    const duels = await db.select()
        .from(duelRooms)
        .where(
            or(
                eq(duelRooms.player1DeckId, deck.id),
                eq(duelRooms.player2DeckId, deck.id)
            )
        )
        .all()
    
    console.log(`Total duels: ${duels.length}`)
    
    let duelWins = 0
    let duelTotal = 0
    
    for (const d of duels) {
        const isP1 = d.player1DeckId === deck.id
        const myPlayerId = isP1 ? d.player1Id : d.player2Id
        
        console.log(`\nDuel ${d.id}: ${d.name}`)
        console.log(`  Status: ${d.status}`)
        console.log(`  Player1: ${d.player1Id} (Deck: ${d.player1DeckId})`)
        console.log(`  Player2: ${d.player2Id} (Deck: ${d.player2DeckId})`)
        console.log(`  Winner: ${d.winnerId} | Result: ${d.result}`)
        
        if (d.status === 'completed') {
            duelTotal++
            const isWinner = d.winnerId === myPlayerId
            console.log(`  -> Counted: YES, Win: ${isWinner}`)
            if (isWinner) duelWins++
        } else {
            console.log(`  -> Counted: NO (not completed)`)
        }
    }
    
    // Summary
    console.log(`\n=== SUMMARY ===`)
    console.log(`Tournament: ${tourneyWins} wins / ${tourneyTotal} matches`)
    console.log(`Duels: ${duelWins} wins / ${duelTotal} matches`)
    console.log(`Total: ${tourneyWins + duelWins} wins / ${tourneyTotal + duelTotal} matches`)
    console.log(`Winrate: ${tourneyTotal + duelTotal > 0 ? Math.round(((tourneyWins + duelWins) / (tourneyTotal + duelTotal)) * 100) : 0}%`)
}

const searchTerm = process.argv[2] || 'Sword'
debugDeck(searchTerm).catch(console.error)
