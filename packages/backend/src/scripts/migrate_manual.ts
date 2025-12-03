import { Database } from 'bun:sqlite';

const db = new Database('local.db');

console.log('Starting manual migration...');

try {
  // 1. Disable FKs
  db.run('PRAGMA foreign_keys = OFF;');

  // 2. Migrate participants
  console.log('Migrating participants...');
  db.run(`
    CREATE TABLE IF NOT EXISTS participants_new (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      tournament_id integer NOT NULL,
      user_id integer,
      guest_name text,
      score integer DEFAULT 0 NOT NULL,
      tie_breakers text DEFAULT '{"buchholz":0}',
      dropped integer DEFAULT false NOT NULL,
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // Copy data
  // Check if guest_name exists in old table (it shouldn't, but just in case)
  const oldColumns = db.prepare("PRAGMA table_info(participants)").all() as any[];
  const hasGuestName = oldColumns.some(c => c.name === 'guest_name');
  
  if (hasGuestName) {
     db.run(`INSERT INTO participants_new SELECT id, tournament_id, user_id, guest_name, score, tie_breakers, dropped FROM participants;`);
  } else {
     db.run(`INSERT INTO participants_new (id, tournament_id, user_id, score, tie_breakers, dropped) SELECT id, tournament_id, user_id, score, tie_breakers, dropped FROM participants;`);
  }

  db.run('DROP TABLE participants;');
  db.run('ALTER TABLE participants_new RENAME TO participants;');

  // 3. Migrate matches
  console.log('Migrating matches...');
  db.run(`
    CREATE TABLE IF NOT EXISTS matches_new (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      tournament_id integer NOT NULL,
      round_number integer NOT NULL,
      player1_id integer,
      player2_id integer,
      winner_id integer,
      result text,
      is_bye integer DEFAULT false NOT NULL,
      created_at text DEFAULT CURRENT_TIMESTAMP NOT NULL,
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id),
      FOREIGN KEY (player1_id) REFERENCES participants(id),
      FOREIGN KEY (player2_id) REFERENCES participants(id),
      FOREIGN KEY (winner_id) REFERENCES participants(id)
    );
  `);

  // Copy data and transform IDs
  // We need to map user_id to participant_id for existing matches
  const matches = db.prepare("SELECT * FROM matches").all() as any[];
  
  const insertMatch = db.prepare(`
    INSERT INTO matches_new (id, tournament_id, round_number, player1_id, player2_id, winner_id, result, is_bye, created_at)
    VALUES ($id, $tournamentId, $roundNumber, $player1Id, $player2Id, $winnerId, $result, $isBye, $createdAt)
  `);

  const getParticipantId = db.prepare("SELECT id FROM participants WHERE user_id = $userId AND tournament_id = $tournamentId");

  for (const match of matches) {
    const p1 = match.player1_id ? getParticipantId.get({ $userId: match.player1_id, $tournamentId: match.tournament_id }) as any : null;
    const p2 = match.player2_id ? getParticipantId.get({ $userId: match.player2_id, $tournamentId: match.tournament_id }) as any : null;
    const winner = match.winner_id ? getParticipantId.get({ $userId: match.winner_id, $tournamentId: match.tournament_id }) as any : null;

    insertMatch.run({
      $id: match.id,
      $tournamentId: match.tournament_id,
      $roundNumber: match.round_number,
      $player1Id: p1 ? p1.id : null,
      $player2Id: p2 ? p2.id : null,
      $winnerId: winner ? winner.id : null,
      $result: match.result,
      $isBye: match.is_bye,
      $createdAt: match.created_at
    });
  }

  db.run('DROP TABLE matches;');
  db.run('ALTER TABLE matches_new RENAME TO matches;');

  // 4. Re-enable FKs
  db.run('PRAGMA foreign_keys = ON;');

  console.log('Migration completed successfully.');
} catch (err) {
  console.error('Migration failed:', err);
} finally {
  db.close();
}
