import express, { Request, Response, NextFunction } from 'express';
import * as path from 'path';
import { findUserByEmail, findUserById, createUser, validatePassword } from './auth';
import { signToken, verifyToken } from './jwt';
import { getAllTasks, getTaskById, saveTask, deleteTask } from './tasks';
import { getUserSessions, saveSession } from './sessions';
import { JwtPayload } from 'jsonwebtoken';

const PUBLIC_DIR = path.join(__dirname, '..', 'public');

/** Decoded JWT attached to request */
interface AuthPayload {
  id: string;
  email: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

// ─── Auth middleware ────────────────────────────────────────────────────────
function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  req.user = payload;
  next();
}

// ─── Admin middleware ───────────────────────────────────────────────────────
function adminMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  next();
}

// ─── App factory ────────────────────────────────────────────────────────────
export function createApp(): express.Application {
  const app = express();

  app.use(express.json());

  // CORS
  app.use((_req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (_req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  // ── Static ──────────────────────────────────────────────────────────────
  app.use(express.static(PUBLIC_DIR));

  // ── API routes ──────────────────────────────────────────────────────────

  // Health
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Register
  app.post('/api/auth/register', (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      res.status(400).json({ error: 'Заполните все поля' });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: 'Пароль минимум 6 символов' });
      return;
    }
    if (findUserByEmail(email)) {
      res.status(409).json({ error: 'Такой email уже существует' });
      return;
    }
    const user = createUser(name, email, password);
    const token = signToken({ id: user.id, email: user.email, role: user.role });
    res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  });

  // Login
  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Заполните все поля' });
      return;
    }
    const user = findUserByEmail(email);
    if (!user || !validatePassword(password, user.password)) {
      res.status(401).json({ error: 'Неверный email или пароль' });
      return;
    }
    const token = signToken({ id: user.id, email: user.email, role: user.role });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  });

  // Profile
  app.get('/api/users/me', authMiddleware, (req, res) => {
    const user = findUserById(req.user!.id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
  });

  // List tasks
  app.get('/api/tasks', (_req, res) => {
    const tasks = getAllTasks().map(t => ({
      id: t.id, name: t.name, description: t.description,
      numQuestions: t.numQuestions, totalQuestions: t.questions.length
    }));
    res.json({ tasks });
  });

  // Get task by id
  app.get('/api/tasks/:id', (req, res) => {
    const task = getTaskById(req.params.id);
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    res.json({ task });
  });

  // Create/update task (admin)
  app.post('/api/tasks', authMiddleware, adminMiddleware, (req, res) => {
    const task = req.body;
    task.id = task.id || 't' + Date.now();
    saveTask(task);
    res.json({ task });
  });

  // Delete task (admin)
  app.delete('/api/tasks/:id', authMiddleware, adminMiddleware, (req, res) => {
    deleteTask(String(req.params.id));
    res.json({ ok: true });
  });

  // Save session result
  app.post('/api/sessions', authMiddleware, (req, res) => {
    const data = req.body;
    const session = {
      id: 's' + Date.now(),
      user_id: req.user!.id,
      task_id: data.taskId,
      task_name: data.taskName || '',
      correct: data.correct || 0,
      total: data.total || 0,
      pct: data.pct || 0,
      date: data.date || new Date().toISOString()
    };
    saveSession(session);
    res.status(201).json({ session });
  });

  // User sessions
  app.get('/api/sessions', authMiddleware, (req, res) => {
    const sessions = getUserSessions(req.user!.id).map(s => ({
      id: s.id, taskId: s.task_id, taskName: s.task_name,
      correct: s.correct, total: s.total, pct: s.pct, date: s.date
    }));
    res.json({ sessions });
  });

  // Fallback for SPA — serve index.html for non-API, non-static routes
  app.use((_req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'index.html'), (err) => {
      if (err) {
        res.status(404).json({ error: 'Not found' });
      }
    });
  });

  return app;
}
