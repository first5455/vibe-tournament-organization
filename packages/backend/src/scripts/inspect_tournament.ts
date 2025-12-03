import { db } from '../db'
import { tournaments, participants, matches } from '../db/schema'
import { eq, desc } from 'drizzle-orm'

async function main() {
  const tournament = await db.select().from(tournaments).orderBy(desc(tournaments.id)).limit(1).get()
  console.log('Latest Tournament:', tournament)

  if (tournament) {
    const parts = await db.select().from(participants).where(eq(participants.tournamentId, tournament.id)).all()
    console.log('Participants:', parts.length)
    
    const m = await db.select().from(matches).where(eq(matches.tournamentId, tournament.id)).all()
    console.log('Matches:', m)
  }
}

main()
