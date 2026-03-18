import { Database } from 'bun:sqlite';

const db = new Database('local.db');

console.log('Starting points column migration...');

try {
  // Check if the column already exists
  const columns = db.prepare("PRAGMA table_info(users)").all() as any[];
  const hasPoints = columns.some((c: any) => c.name === 'points');

  if (hasPoints) {
    console.log('Points column already exists. Skipping migration.');
  } else {
    db.run('ALTER TABLE users ADD COLUMN points integer DEFAULT 0 NOT NULL;');
    console.log('Added points column to users table.');
  }

  console.log('Migration completed successfully.');
} catch (err) {
  console.error('Migration failed:', err);
} finally {
  db.close();
}
