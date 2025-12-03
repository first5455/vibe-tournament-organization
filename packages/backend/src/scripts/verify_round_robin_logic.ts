import { db } from '../db';
import { tournaments, participants, matches, users } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import { generatePairings } from '../services/round_robin';

async function verifyRoundRobin() {
  console.log('Starting Round Robin Verification...');

  // 1. Create a test tournament
  const [tournament] = await db.insert(tournaments).values({
    name: 'RR Verification Tournament',
    type: 'round_robin',
    status: 'pending',
    totalRounds: 0,
    currentRound: 1,
    createdBy: 1 // Assuming admin exists
  }).returning();

  console.log('Created tournament:', tournament.id);

  // 2. Add participants (4 players)
  const playerIds = [];
  for (let i = 1; i <= 4; i++) {
    const [user] = await db.insert(users).values({
      username: `rr_test_user_${i}_${Date.now()}`,
      passwordHash: 'hash',
      mmr: 1000
    }).returning();
    
    const [participant] = await db.insert(participants).values({
      tournamentId: tournament.id,
      userId: user.id,
      score: 0,
      dropped: false
    }).returning();
    playerIds.push(participant.id);
  }
  console.log('Added 4 participants');

  // 3. Start Tournament (Simulate logic from routes/tournaments.ts)
  // Logic: For RR, totalRounds = n - 1 (or n if odd? logic handles it).
  // And we generate ALL pairings.
  
  const n = playerIds.length;
  const totalRounds = n % 2 === 0 ? n - 1 : n;
  
  await db.update(tournaments)
    .set({ status: 'active', totalRounds, startDate: new Date().toISOString() })
    .where(eq(tournaments.id, tournament.id));

  console.log(`Starting tournament with ${totalRounds} rounds`);

  for (let r = 1; r <= totalRounds; r++) {
    await generatePairings(tournament.id, r);
  }

  // 4. Verify Matches
  const allMatches = await db.select().from(matches).where(eq(matches.tournamentId, tournament.id));
  console.log(`Generated ${allMatches.length} matches`);

  // Expected matches for 4 players: 4 * 3 / 2 = 6 matches.
  if (allMatches.length !== 6) {
    console.error('FAILED: Expected 6 matches, got', allMatches.length);
  } else {
    console.log('SUCCESS: Correct number of matches generated.');
  }

  // Check if every pair plays exactly once
  const pairs = new Set();
  for (const m of allMatches) {
    const p1 = m.player1Id;
    const p2 = m.player2Id;
    if (!p2) continue; // Bye
    const pair = [p1, p2].sort().join('-');
    if (pairs.has(pair)) {
      console.error('FAILED: Duplicate pairing found:', pair);
    }
    pairs.add(pair);
  }

  if (pairs.size === 6) {
    console.log('SUCCESS: All unique pairs generated.');
  } else {
    console.error('FAILED: Expected 6 unique pairs, got', pairs.size);
  }

  // Cleanup
  // await db.delete(tournaments).where(eq(tournaments.id, tournament.id));
}

verifyRoundRobin().catch(console.error);
