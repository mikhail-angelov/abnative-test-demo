/**
 * Integration tests for abnative API.
 * Runs on native node:test with in-memory SQLite.
 *
 * Run: node --test tests/api.test.ts
 * Or:  npx tsx --test tests/api.test.ts
 */
import 'dotenv/config';
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { Server } from 'http';
import { setDb, closeDb } from '../src/db.js';
import { migrate } from '../src/migrate.js';
import { seedDefaults } from '../src/seed.js';
import { createApp } from '../src/app.js';

let server: Server;
let adminToken: string;
let userToken: string;

async function request(
  method: string,
  path: string,
  body?: any,
  token?: string,
): Promise<{ status: number; body: any }> {
  const port = (server.address() as any).port;
  const opts: any = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (token) opts.headers['Authorization'] = 'Bearer ' + token;

  const url = `http://127.0.0.1:${port}${path}`;
  const res = await fetch(url, {
    ...opts,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = text;
  }
  return { status: res.status, body: parsed };
}

// ─── Setup ─────────────────────────────────────────────────────────────────
before(async () => {
  const memDb = new Database(':memory:');
  memDb.pragma('journal_mode = WAL');
  memDb.pragma('foreign_keys = ON');
  setDb(memDb);

  migrate();
  seedDefaults();

  const app = createApp();
  server = app.listen(0, '127.0.0.1');

  await new Promise<void>((resolve) => server.on('listening', resolve));

  const loginRes = await request('POST', '/api/auth/login', {
    email: 'admin@abnative.ru',
    password: 'admin123',
  });
  adminToken = loginRes.body.token;
});

after(() => {
  server?.close();
  closeDb();
});

// ─── Health ────────────────────────────────────────────────────────────────
describe('GET /api/health', () => {
  it('returns status ok', async () => {
    const { status, body } = await request('GET', '/api/health');
    assert.equal(status, 200);
    assert.equal(body.status, 'ok');
    assert.ok(body.time);
  });
});

// ─── Auth ───────────────────────────────────────────────────────────────────
describe('POST /api/auth/register', () => {
  it('registers a new user', async () => {
    const { status, body } = await request('POST', '/api/auth/register', {
      name: 'Test User',
      email: 'test@example.com',
      password: 'secret123',
    });
    assert.equal(status, 201);
    assert.ok(body.token);
    assert.equal(body.user.name, 'Test User');
    assert.equal(body.user.role, 'user');
    userToken = body.token;
  });

  it('rejects missing fields', async () => {
    const { status, body } = await request('POST', '/api/auth/register', {
      name: 'nope',
      email: 'x@y.com',
    });
    assert.equal(status, 400);
    assert.ok(body.error.includes('Заполните'));
  });

  it('rejects short password', async () => {
    const { status, body } = await request('POST', '/api/auth/register', {
      name: 'Short',
      email: 'short@t.com',
      password: '12',
    });
    assert.equal(status, 400);
    assert.ok(body.error.includes('6 символов'));
  });

  it('rejects duplicate email', async () => {
    const { status, body } = await request('POST', '/api/auth/register', {
      name: 'Dup',
      email: 'test@example.com',
      password: 'secret123',
    });
    assert.equal(status, 409);
    assert.ok(body.error.includes('существует'));
  });
});

describe('POST /api/auth/login', () => {
  it('logs in with valid credentials', async () => {
    const { status, body } = await request('POST', '/api/auth/login', {
      email: 'test@example.com',
      password: 'secret123',
    });
    assert.equal(status, 200);
    assert.ok(body.token);
    assert.equal(body.user.email, 'test@example.com');
  });

  it('logs in admin', async () => {
    const { status, body } = await request('POST', '/api/auth/login', {
      email: 'admin@abnative.ru',
      password: 'admin123',
    });
    assert.equal(status, 200);
    assert.equal(body.user.role, 'admin');
  });

  it('rejects wrong password', async () => {
    const { status } = await request('POST', '/api/auth/login', {
      email: 'admin@abnative.ru',
      password: 'wrong',
    });
    assert.equal(status, 401);
  });

  it('rejects missing fields', async () => {
    const { status, body } = await request('POST', '/api/auth/login', {
      email: 'x',
    });
    assert.equal(status, 400);
  });
});

// ─── Profile ───────────────────────────────────────────────────────────────
describe('GET /api/users/me', () => {
  it('returns profile with valid token', async () => {
    const { status, body } = await request('GET', '/api/users/me', undefined, userToken);
    assert.equal(status, 200);
    assert.equal(body.email, 'test@example.com');
  });

  it('rejects without token', async () => {
    const { status } = await request('GET', '/api/users/me');
    assert.equal(status, 401);
  });

  it('rejects invalid token', async () => {
    const { status } = await request('GET', '/api/users/me', undefined, 'bad');
    assert.equal(status, 401);
  });
});

// ─── Tasks ─────────────────────────────────────────────────────────────────
describe('GET /api/tasks', () => {
  it('returns task list (public)', async () => {
    const { status, body } = await request('GET', '/api/tasks');
    assert.equal(status, 200);
    assert.ok(Array.isArray(body.tasks));
    assert.ok(body.tasks.length >= 1);
    assert.ok(body.tasks[0].name);
  });
});

describe('GET /api/tasks/:id', () => {
  it('returns task by id', async () => {
    const { body } = await request('GET', '/api/tasks');
    const taskId = body.tasks[0].id;
    const { status, body: tb } = await request('GET', `/api/tasks/${taskId}`);
    assert.equal(status, 200);
    assert.equal(tb.task.id, taskId);
    assert.ok(Array.isArray(tb.task.questions));
  });

  it('returns 404 for unknown task', async () => {
    const { status } = await request('GET', '/api/tasks/nonexistent');
    assert.equal(status, 404);
  });
});

describe('POST /api/tasks (admin)', () => {
  const newTask = {
    name: 'Новое задание',
    description: 'Описание',
    numQuestions: 3,
    questions: [
      {
        text: 'Q1',
        options: [
          { text: 'A', c: true },
          { text: 'B', c: false },
        ],
        expl: 'Ok',
      },
    ],
  };

  it('creates task as admin', async () => {
    const { status, body } = await request('POST', '/api/tasks', newTask, adminToken);
    assert.equal(status, 200);
    assert.equal(body.task.name, 'Новое задание');
    assert.ok(body.task.id);
  });

  it('rejects non-admin', async () => {
    const { status } = await request('POST', '/api/tasks', newTask, userToken);
    assert.equal(status, 403);
  });

  it('rejects without auth', async () => {
    const { status } = await request('POST', '/api/tasks', newTask);
    assert.equal(status, 401);
  });
});

describe('DELETE /api/tasks/:id (admin)', () => {
  let taskId: string;

  before(async () => {
    const { body } = await request(
      'POST',
      '/api/tasks',
      {
        name: 'ToDelete',
        numQuestions: 1,
        questions: [{ text: 'Q', options: [{ text: 'A', c: true }], expl: '' }],
      },
      adminToken,
    );
    taskId = body.task.id;
  });

  it('deletes task as admin', async () => {
    const { status } = await request('DELETE', `/api/tasks/${taskId}`, undefined, adminToken);
    assert.equal(status, 200);
    const { status: s2 } = await request('GET', `/api/tasks/${taskId}`);
    assert.equal(s2, 404);
  });

  it('creates another and rejects non-admin delete', async () => {
    const { body } = await request(
      'POST',
      '/api/tasks',
      {
        name: 'ToDelete2',
        numQuestions: 1,
        questions: [{ text: 'Q', options: [{ text: 'A', c: true }], expl: '' }],
      },
      adminToken,
    );
    const { status } = await request('DELETE', `/api/tasks/${body.task.id}`, undefined, userToken);
    assert.equal(status, 403);
  });
});

// ─── Sessions ──────────────────────────────────────────────────────────────
describe('POST /api/sessions', () => {
  it('saves session result', async () => {
    const { status, body } = await request(
      'POST',
      '/api/sessions',
      { taskId: 't1', taskName: 'Test', correct: 4, total: 5, pct: 80, date: '2026-05-04 17:00' },
      userToken,
    );
    assert.equal(status, 201);
    assert.ok(body.session.id);
    assert.equal(body.session.correct, 4);
  });

  it('rejects without auth', async () => {
    const { status } = await request('POST', '/api/sessions', {
      taskId: 't1',
      correct: 1,
      total: 2,
      pct: 50,
    });
    assert.equal(status, 401);
  });
});

describe('GET /api/sessions', () => {
  it('returns user sessions', async () => {
    const { status, body } = await request('GET', '/api/sessions', undefined, userToken);
    assert.equal(status, 200);
    assert.ok(Array.isArray(body.sessions));
    assert.ok(body.sessions.length >= 1);
  });

  it('rejects without auth', async () => {
    const { status } = await request('GET', '/api/sessions');
    assert.equal(status, 401);
  });
});

// ─── 404 ───────────────────────────────────────────────────────────────────
describe('Unknown routes', () => {
  it('returns 404 for unknown API path', async () => {
    const { status, body } = await request('GET', '/api/unknown');
    assert.equal(status, 404);
  });
});
