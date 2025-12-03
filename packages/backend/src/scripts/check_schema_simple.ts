import { db } from '../db';
import { sql } from 'drizzle-orm';

async function checkSchema() {
  console.log('Checking schema...');
  const result = await db.run(sql`PRAGMA table_info(tournaments)`);
  console.log('Table Info:', JSON.stringify(result, null, 2));
}

checkSchema().catch(console.error);
