import { getDb } from './db';
import { Session } from './seed';

export function getUserSessions(userId: string): Session[] {
  const db = getDb();
  return db.prepare('SELECT * FROM sessions WHERE user_id = ? ORDER BY date DESC LIMIT 100').all(userId) as Session[];
}

export function saveSession(session: Session): void {
  const db = getDb();
  db.prepare('INSERT INTO sessions (id, user_id, task_id, task_name, correct, total, pct, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
    session.id, session.user_id, session.task_id, session.task_name, session.correct, session.total, session.pct, session.date
  );
}
