import { getDb } from './db';
import { Task } from './seed';

export function getAllTasks(): Task[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM tasks ORDER BY name').all() as any[];
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    description: r.description,
    numQuestions: r.num_questions,
    questions: JSON.parse(r.data)
  }));
}

export function getTaskById(id: string): Task | undefined {
  const db = getDb();
  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as any;
  if (!row) return undefined;
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    numQuestions: row.num_questions,
    questions: JSON.parse(row.data)
  };
}

export function saveTask(task: Task): void {
  const db = getDb();
  db.prepare('INSERT OR REPLACE INTO tasks (id, name, description, num_questions, data) VALUES (?, ?, ?, ?, ?)').run(
    task.id, task.name, task.description, task.numQuestions, JSON.stringify(task.questions)
  );
}

export function deleteTask(id: string): void {
  const db = getDb();
  db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
}
