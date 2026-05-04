import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import * as http from 'http';
import { setDb, closeDb } from '../src/db';
import { migrate } from '../src/migrate';
import { seedDefaults } from '../src/seed';
import { createHandler } from '../src/app';

let url: string;
let server: http.Server;
let adminToken: string;
let userToken: string;
let userId: string;

/** Helper: make a JSON request and return parsed body + status */
async function request(method: string, path: string, body?: any, token?: string): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const opts: http.RequestOptions = {
      hostname: '127.0.0.1',
      port: (server.address() as any).port,
      path,
      method,
      headers: { 'Content-Type': 'application/json' } as any,
    };
    if (token) {
      opts.headers!['Authorization'] = 'Bearer ' + token;
    }
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode || 0, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode || 0, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body !== undefined) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

beforeAll(async () => {
  // Use in-memory SQLite
  const memDb = new Database(':memory:');
  memDb.pragma('journal_mode = WAL');
  memDb.pragma('foreign_keys = ON');
  setDb(memDb);

  migrate();
  seedDefaults();

  const handler = createHandler();
  server = http.createServer(handler);

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  url = `http://127.0.0.1:${(server.address() as any).port}`;

  // Log in as admin for token
  const loginRes = await request('POST', '/api/auth/login', { email: 'admin@abnative.ru', password: 'admin123' });
  adminToken = loginRes.body.token;
});

afterAll(async () => {
  server?.close();
  closeDb();
});

// ─── Health ────────────────────────────────────────────────────────────────
describe('GET /api/health', () => {
  it('returns status ok', async () => {
    const { status, body } = await request('GET', '/api/health');
    expect(status).toBe(200);
    expect(body.status).toBe('ok');
    expect(body.time).toBeDefined();
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
    expect(status).toBe(201);
    expect(body.token).toBeDefined();
    expect(body.user.name).toBe('Test User');
    expect(body.user.role).toBe('user');
    userToken = body.token;
    userId = body.user.id;
  });

  it('rejects registration with missing fields', async () => {
    const { status, body } = await request('POST', '/api/auth/register', {
      name: 'No Pass',
      email: 'nopass@test.com',
    });
    expect(status).toBe(400);
    expect(body.error).toContain('Заполните');
  });

  it('rejects short password', async () => {
    const { status, body } = await request('POST', '/api/auth/register', {
      name: 'Short',
      email: 'short@test.com',
      password: '12',
    });
    expect(status).toBe(400);
    expect(body.error).toContain('6 символов');
  });

  it('rejects duplicate email', async () => {
    const { status, body } = await request('POST', '/api/auth/register', {
      name: 'Dup',
      email: 'test@example.com',
      password: 'secret123',
    });
    expect(status).toBe(409);
    expect(body.error).toContain('существует');
  });
});

describe('POST /api/auth/login', () => {
  it('logs in with valid credentials', async () => {
    const { status, body } = await request('POST', '/api/auth/login', {
      email: 'test@example.com',
      password: 'secret123',
    });
    expect(status).toBe(200);
    expect(body.token).toBeDefined();
    expect(body.user.email).toBe('test@example.com');
  });

  it('logs in admin user', async () => {
    const { status, body } = await request('POST', '/api/auth/login', {
      email: 'admin@abnative.ru',
      password: 'admin123',
    });
    expect(status).toBe(200);
    expect(body.user.role).toBe('admin');
  });

  it('rejects wrong password', async () => {
    const { status, body } = await request('POST', '/api/auth/login', {
      email: 'admin@abnative.ru',
      password: 'wrong',
    });
    expect(status).toBe(401);
  });

  it('rejects non-existent email', async () => {
    const { status, body } = await request('POST', '/api/auth/login', {
      email: 'nobody@test.com',
      password: 'x',
    });
    expect(status).toBe(401);
  });

  it('rejects missing fields', async () => {
    const { status, body } = await request('POST', '/api/auth/login', { email: 'x' });
    expect(status).toBe(400);
  });
});

// ─── Users / Profile ───────────────────────────────────────────────────────
describe('GET /api/users/me', () => {
  it('returns user profile with valid token', async () => {
    const { status, body } = await request('GET', '/api/users/me', undefined, userToken);
    expect(status).toBe(200);
    expect(body.email).toBe('test@example.com');
  });

  it('rejects without token', async () => {
    const { status } = await request('GET', '/api/users/me');
    expect(status).toBe(401);
  });

  it('rejects with invalid token', async () => {
    const { status } = await request('GET', '/api/users/me', undefined, 'invalid-token');
    expect(status).toBe(401);
  });
});

// ─── Tasks ──────────────────────────────────────────────────────────────────
describe('GET /api/tasks', () => {
  it('returns list of tasks (public)', async () => {
    const { status, body } = await request('GET', '/api/tasks');
    expect(status).toBe(200);
    expect(Array.isArray(body.tasks)).toBe(true);
    expect(body.tasks.length).toBeGreaterThanOrEqual(1);
    expect(body.tasks[0].name).toBeDefined();
  });
});

describe('GET /api/tasks/:id', () => {
  it('returns a task by id with full questions', async () => {
    const { body } = await request('GET', '/api/tasks');
    const taskId = body.tasks[0].id;

    const { status, body: taskBody } = await request('GET', `/api/tasks/${taskId}`);
    expect(status).toBe(200);
    expect(taskBody.task.id).toBe(taskId);
    expect(Array.isArray(taskBody.task.questions)).toBe(true);
    expect(taskBody.task.questions.length).toBeGreaterThan(0);
  });

  it('returns 404 for unknown task', async () => {
    const { status } = await request('GET', '/api/tasks/nonexistent');
    expect(status).toBe(404);
  });
});

describe('POST /api/tasks (admin)', () => {
  const newTask = {
    name: 'Новое задание',
    description: 'Описание',
    numQuestions: 3,
    questions: [
      { text: 'Q1', options: [{ text: 'A', c: true }, { text: 'B', c: false }], expl: 'Ok' },
      { text: 'Q2', options: [{ text: 'X', c: true }], expl: 'Yes' },
    ],
  };

  it('creates a task when admin', async () => {
    const { status, body } = await request('POST', '/api/tasks', newTask, adminToken);
    expect(status).toBe(200);
    expect(body.task.name).toBe('Новое задание');
    expect(body.task.id).toBeDefined();
  });

  it('rejects when non-admin user tries to create', async () => {
    const { status } = await request('POST', '/api/tasks', newTask, userToken);
    expect(status).toBe(403);
  });

  it('rejects without auth', async () => {
    const { status } = await request('POST', '/api/tasks', newTask);
    expect(status).toBe(403);
  });
});

describe('DELETE /api/tasks/:id (admin)', () => {
  let taskId: string;
  beforeEach(async () => {
    const { body } = await request('POST', '/api/tasks', {
      name: 'ToDelete',
      numQuestions: 1,
      questions: [{ text: 'Q', options: [{ text: 'A', c: true }], expl: '' }],
    }, adminToken);
    taskId = body.task.id;
  });

  it('deletes a task when admin', async () => {
    const { status } = await request('DELETE', `/api/tasks/${taskId}`, undefined, adminToken);
    expect(status).toBe(200);

    const { status: getStatus } = await request('GET', `/api/tasks/${taskId}`);
    expect(getStatus).toBe(404);
  });

  it('rejects when non-admin tries to delete', async () => {
    const { status } = await request('DELETE', `/api/tasks/${taskId}`, undefined, userToken);
    expect(status).toBe(403);
  });
});

// ─── Sessions ───────────────────────────────────────────────────────────────
describe('POST /api/sessions', () => {
  it('saves a session result', async () => {
    const { status, body } = await request('POST', '/api/sessions', {
      taskId: 't1',
      taskName: 'Test',
      correct: 4,
      total: 5,
      pct: 80,
      date: '2026-05-04 17:00',
    }, userToken);
    expect(status).toBe(201);
    expect(body.session.id).toBeDefined();
    expect(body.session.correct).toBe(4);
  });

  it('rejects without auth', async () => {
    const { status } = await request('POST', '/api/sessions', { taskId: 't1', correct: 1, total: 2, pct: 50 });
    expect(status).toBe(401);
  });
});

describe('GET /api/sessions', () => {
  it('returns user sessions', async () => {
    const { status, body } = await request('GET', '/api/sessions', undefined, userToken);
    expect(status).toBe(200);
    expect(Array.isArray(body.sessions)).toBe(true);
    expect(body.sessions.length).toBeGreaterThanOrEqual(1);
    expect(body.sessions[0].taskName).toBeDefined();
  });

  it('rejects without auth', async () => {
    const { status } = await request('GET', '/api/sessions');
    expect(status).toBe(401);
  });
});

// ─── 404 ────────────────────────────────────────────────────────────────────
describe('Unknown routes', () => {
  it('returns 404 for unknown API path', async () => {
    const { status, body } = await request('GET', '/api/unknown');
    expect(status).toBe(404);
    expect(body.error).toBe('Not found');
  });

  it('returns 404 for unknown static file', async () => {
    const { status, body } = await request('GET', '/no-such-file.html');
    expect(status).toBe(404);
  });
});
