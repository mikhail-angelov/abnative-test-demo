import { URL } from 'url';
import * as fs from 'fs';
import * as path from 'path';
import { getDb, closeDb } from './db';
import { migrate } from './migrate';
import { seedDefaults } from './seed';
import { findUserByEmail, findUserById, createUser, validatePassword } from './auth';
import { signToken, verifyToken } from './jwt';
import { getAllTasks, getTaskById, saveTask, deleteTask } from './tasks';
import { getUserSessions, saveSession } from './sessions';
import * as http from 'http';

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const DATA_DIR = path.join(__dirname, '..', 'data');

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

export function parseUrl(raw: string): { pathname: string; params: URLSearchParams } {
  const u = new URL(raw, 'http://localhost');
  return { pathname: u.pathname, params: u.searchParams };
}

export function parseBody(raw: string): any {
  try { return JSON.parse(raw); } catch { return {}; }
}

export function sendJson(res: http.ServerResponse, status: number, data: any): void {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  });
  res.end(body);
}

export function sendFile(res: http.ServerResponse, filePath: string): void {
  const ext = path.extname(filePath);
  const mime = MIME[ext] || 'application/octet-stream';
  try {
    const content = fs.readFileSync(filePath);
    res.writeHead(200, {
      'Content-Type': mime,
      'Content-Length': content.length,
    });
    res.end(content);
  } catch {
    sendJson(res, 404, { error: 'Not found' });
  }
}

export function createHandler(): (req: http.IncomingMessage, res: http.ServerResponse) => Promise<void> {
  return async function handle(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
    const { pathname } = parseUrl(req.url || '/');
    const method = req.method!.toUpperCase();

    // CORS preflight
    if (method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      });
      res.end();
      return;
    }

    // Body parser
    let body = '';
    if (['POST', 'PUT'].includes(method)) {
      body = await new Promise<string>((resolve) => {
        let data = '';
        req.on('data', (chunk: string) => data += chunk);
        req.on('end', () => resolve(data));
      });
    }

    try {
      // ===== STATIC FILES =====
      if (pathname === '/' || pathname === '/index.html') {
        const indexPath = path.join(PUBLIC_DIR, 'index.html');
        if (fs.existsSync(indexPath)) {
          sendFile(res, indexPath);
        } else {
          sendJson(res, 200, { message: 'Abnative Server Running. Place index.html in public/' });
        }
        return;
      }

      if (!pathname.startsWith('/api/')) {
        const filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
        sendFile(res, filePath);
        return;
      }

      // ===== API =====

      // GET /api/health
      if (pathname === '/api/health' && method === 'GET') {
        sendJson(res, 200, { status: 'ok', time: new Date().toISOString() });
        return;
      }

      // POST /api/auth/register
      if (pathname === '/api/auth/register' && method === 'POST') {
        const { name, email, password } = parseBody(body);
        if (!name || !email || !password) {
          sendJson(res, 400, { error: 'Заполните все поля' });
          return;
        }
        if (password.length < 6) {
          sendJson(res, 400, { error: 'Пароль минимум 6 символов' });
          return;
        }
        if (findUserByEmail(email)) {
          sendJson(res, 409, { error: 'Такой email уже существует' });
          return;
        }
        const user = createUser(name, email, password);
        const token = signToken({ id: user.id, email: user.email, role: user.role });
        sendJson(res, 201, { token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
        return;
      }

      // POST /api/auth/login
      if (pathname === '/api/auth/login' && method === 'POST') {
        const { email, password } = parseBody(body);
        if (!email || !password) {
          sendJson(res, 400, { error: 'Заполните все поля' });
          return;
        }
        const user = findUserByEmail(email);
        if (!user || !validatePassword(password, user.password)) {
          sendJson(res, 401, { error: 'Неверный email или пароль' });
          return;
        }
        const token = signToken({ id: user.id, email: user.email, role: user.role });
        sendJson(res, 200, { token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
        return;
      }

      // Auth middleware for protected routes
      const authHeader = req.headers['authorization'] || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
      const payload = verifyToken(token);

      // GET /api/users/me
      if (pathname === '/api/users/me' && method === 'GET') {
        if (!payload) { sendJson(res, 401, { error: 'Unauthorized' }); return; }
        const user = findUserById(payload.id);
        if (!user) { sendJson(res, 404, { error: 'User not found' }); return; }
        sendJson(res, 200, { id: user.id, name: user.name, email: user.email, role: user.role });
        return;
      }

      // GET /api/tasks
      if (pathname === '/api/tasks' && method === 'GET') {
        const tasks = getAllTasks().map(t => ({
          id: t.id, name: t.name, description: t.description,
          numQuestions: t.numQuestions, totalQuestions: t.questions.length
        }));
        sendJson(res, 200, { tasks });
        return;
      }

      // GET /api/tasks/:id
      const taskMatch = pathname.match(/^\/api\/tasks\/([a-zA-Z0-9_]+)$/);
      if (taskMatch && method === 'GET') {
        const task = getTaskById(taskMatch[1]);
        if (!task) { sendJson(res, 404, { error: 'Task not found' }); return; }
        sendJson(res, 200, { task });
        return;
      }

      // POST /api/tasks (admin only)
      if (pathname === '/api/tasks' && method === 'POST') {
        if (!payload || payload.role !== 'admin') { sendJson(res, 403, { error: 'Forbidden' }); return; }
        const task = parseBody(body);
        task.id = task.id || 't' + Date.now();
        saveTask(task);
        sendJson(res, 200, { task });
        return;
      }

      // DELETE /api/tasks/:id (admin only)
      if (taskMatch && method === 'DELETE') {
        if (!payload || payload.role !== 'admin') { sendJson(res, 403, { error: 'Forbidden' }); return; }
        deleteTask(taskMatch[1]);
        sendJson(res, 200, { ok: true });
        return;
      }

      // POST /api/sessions
      if (pathname === '/api/sessions' && method === 'POST') {
        if (!payload) { sendJson(res, 401, { error: 'Unauthorized' }); return; }
        const data = parseBody(body);
        const session = {
          id: 's' + Date.now(),
          user_id: payload.id,
          task_id: data.taskId,
          task_name: data.taskName || '',
          correct: data.correct || 0,
          total: data.total || 0,
          pct: data.pct || 0,
          date: data.date || new Date().toISOString()
        };
        saveSession(session);
        sendJson(res, 201, { session });
        return;
      }

      // GET /api/sessions
      if (pathname === '/api/sessions' && method === 'GET') {
        if (!payload) { sendJson(res, 401, { error: 'Unauthorized' }); return; }
        const sessions = getUserSessions(payload.id).map(s => ({
          id: s.id, taskId: s.task_id, taskName: s.task_name,
          correct: s.correct, total: s.total, pct: s.pct, date: s.date
        }));
        sendJson(res, 200, { sessions });
        return;
      }

      // 404
      sendJson(res, 404, { error: 'Not found' });
    } catch (err: any) {
      console.error('Request error:', err);
      sendJson(res, 500, { error: 'Internal server error' });
    }
  };
}
