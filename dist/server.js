"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const url_1 = require("url");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const db_1 = require("./db");
const migrate_1 = require("./migrate");
const seed_1 = require("./seed");
const auth_1 = require("./auth");
const jwt_1 = require("./jwt");
const tasks_1 = require("./tasks");
const sessions_1 = require("./sessions");
const PORT = parseInt(process.env.PORT || '3010', 10);
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const DATA_DIR = path.join(__dirname, '..', 'data');
// Ensure directories
if (!fs.existsSync(DATA_DIR))
    fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(PUBLIC_DIR))
    fs.mkdirSync(PUBLIC_DIR, { recursive: true });
// Init DB
(0, migrate_1.migrate)();
(0, seed_1.seedDefaults)();
const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
};
function parseUrl(raw) {
    const u = new url_1.URL(raw, 'http://localhost');
    return { pathname: u.pathname, params: u.searchParams };
}
function parseBody(raw) {
    try {
        return JSON.parse(raw);
    }
    catch {
        return {};
    }
}
function sendJson(res, status, data) {
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
function sendFile(res, filePath) {
    const ext = path.extname(filePath);
    const mime = MIME[ext] || 'application/octet-stream';
    try {
        const content = fs.readFileSync(filePath);
        res.writeHead(200, {
            'Content-Type': mime,
            'Content-Length': content.length,
        });
        res.end(content);
    }
    catch {
        sendJson(res, 404, { error: 'Not found' });
    }
}
// Request handler
async function handle(req, res) {
    const { pathname, params } = parseUrl(req.url || '/');
    const method = req.method.toUpperCase();
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
        body = await new Promise((resolve) => {
            let data = '';
            req.on('data', (chunk) => data += chunk);
            req.on('end', () => resolve(data));
        });
    }
    try {
        // ===== STATIC FILES =====
        if (pathname === '/' || pathname === '/index.html') {
            const indexPath = path.join(PUBLIC_DIR, 'index.html');
            if (fs.existsSync(indexPath)) {
                sendFile(res, indexPath);
            }
            else {
                sendJson(res, 200, { message: 'Abnative Server Running. Place index.html in public/' });
            }
            return;
        }
        // Static files in /public
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
            if ((0, auth_1.findUserByEmail)(email)) {
                sendJson(res, 409, { error: 'Такой email уже существует' });
                return;
            }
            const user = (0, auth_1.createUser)(name, email, password);
            const token = (0, jwt_1.signToken)({ id: user.id, email: user.email, role: user.role });
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
            const user = (0, auth_1.findUserByEmail)(email);
            if (!user || !(0, auth_1.validatePassword)(password, user.password)) {
                sendJson(res, 401, { error: 'Неверный email или пароль' });
                return;
            }
            const token = (0, jwt_1.signToken)({ id: user.id, email: user.email, role: user.role });
            sendJson(res, 200, { token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
            return;
        }
        // Auth middleware for protected routes
        const authHeader = req.headers['authorization'] || '';
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
        const payload = (0, jwt_1.verifyToken)(token);
        // GET /api/users/me
        if (pathname === '/api/users/me' && method === 'GET') {
            if (!payload) {
                sendJson(res, 401, { error: 'Unauthorized' });
                return;
            }
            const user = (0, auth_1.findUserById)(payload.id);
            if (!user) {
                sendJson(res, 404, { error: 'User not found' });
                return;
            }
            sendJson(res, 200, { id: user.id, name: user.name, email: user.email, role: user.role });
            return;
        }
        // GET /api/tasks
        if (pathname === '/api/tasks' && method === 'GET') {
            const tasks = (0, tasks_1.getAllTasks)().map(t => ({
                id: t.id, name: t.name, description: t.description,
                numQuestions: t.numQuestions, totalQuestions: t.questions.length
            }));
            sendJson(res, 200, { tasks });
            return;
        }
        // GET /api/tasks/:id
        const taskMatch = pathname.match(/^\/api\/tasks\/([a-zA-Z0-9_]+)$/);
        if (taskMatch && method === 'GET') {
            const task = (0, tasks_1.getTaskById)(taskMatch[1]);
            if (!task) {
                sendJson(res, 404, { error: 'Task not found' });
                return;
            }
            sendJson(res, 200, { task });
            return;
        }
        // POST /api/tasks (admin only)
        if (pathname === '/api/tasks' && method === 'POST') {
            if (!payload || payload.role !== 'admin') {
                sendJson(res, 403, { error: 'Forbidden' });
                return;
            }
            const task = parseBody(body);
            task.id = task.id || 't' + Date.now();
            (0, tasks_1.saveTask)(task);
            sendJson(res, 200, { task });
            return;
        }
        // DELETE /api/tasks/:id (admin only)
        if (taskMatch && method === 'DELETE') {
            if (!payload || payload.role !== 'admin') {
                sendJson(res, 403, { error: 'Forbidden' });
                return;
            }
            (0, tasks_1.deleteTask)(taskMatch[1]);
            sendJson(res, 200, { ok: true });
            return;
        }
        // POST /api/sessions
        if (pathname === '/api/sessions' && method === 'POST') {
            if (!payload) {
                sendJson(res, 401, { error: 'Unauthorized' });
                return;
            }
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
            (0, sessions_1.saveSession)(session);
            sendJson(res, 201, { session });
            return;
        }
        // GET /api/sessions
        if (pathname === '/api/sessions' && method === 'GET') {
            if (!payload) {
                sendJson(res, 401, { error: 'Unauthorized' });
                return;
            }
            const sessions = (0, sessions_1.getUserSessions)(payload.id).map(s => ({
                id: s.id, taskId: s.task_id, taskName: s.task_name,
                correct: s.correct, total: s.total, pct: s.pct, date: s.date
            }));
            sendJson(res, 200, { sessions });
            return;
        }
        // 404
        sendJson(res, 404, { error: 'Not found' });
    }
    catch (err) {
        console.error('Request error:', err);
        sendJson(res, 500, { error: 'Internal server error' });
    }
}
const server = require('http').createServer(handle);
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Static files from: ${PUBLIC_DIR}`);
});
process.on('SIGINT', () => { (0, db_1.closeDb)(); process.exit(0); });
process.on('SIGTERM', () => { (0, db_1.closeDb)(); process.exit(0); });
