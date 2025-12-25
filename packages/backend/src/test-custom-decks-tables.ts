// Quick script to test if tables exist
import { Database } from 'bun:sqlite'

const sqlite = new Database(process.env.DATABASE_URL ||  'file:local.db')

console.log('Testing custom decks tables...')

try {
  const tables = sqlite.query(`SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'custom%'`).all()
  console.log('Custom tables found:', tables)
  
  if (tables.length > 0) {
    const deckSchema = sqlite.query(`PRAGMA table_info(custom_decks)`).all()
    console.log('\\ncustom_decks schema:', deckSchema)
    
    const cardSchema = sqlite.query(`PRAGMA table_info(custom_deck_cards)`).all()
    console.log('\\ncustom_deck_cards schema:', cardSchema)
  }
} catch (err) {
  console.error('Error checking tables:', err)
}

sqlite.close()
