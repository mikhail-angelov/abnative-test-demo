import Database from 'better-sqlite3';

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    const DB_PATH = process.env.DB_PATH || ':memory:';
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}

/** Used by tests to inject an in-memory database */
export function setDb(mock: Database.Database): void {
  db = mock;
}
