import { db } from '../db';
import { tournaments } from '../db/schema';
import { eq } from 'drizzle-orm';

async function inspectGG() {
  console.log('Inspecting tournament "gg"...');
  const tournament = await db.select().from(tournaments).where(eq(tournaments.name, 'gg')).get();
  
  if (!tournament) {
    console.log('Tournament "gg" not found.');
  } else {
    console.log('Tournament found:', JSON.stringify(tournament, null, 2));
  }
}

inspectGG().catch(console.error);
