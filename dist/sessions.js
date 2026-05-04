"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserSessions = getUserSessions;
exports.saveSession = saveSession;
const db_1 = require("./db");
function getUserSessions(userId) {
    const db = (0, db_1.getDb)();
    return db.prepare('SELECT * FROM sessions WHERE user_id = ? ORDER BY date DESC LIMIT 100').all(userId);
}
function saveSession(session) {
    const db = (0, db_1.getDb)();
    db.prepare('INSERT INTO sessions (id, user_id, task_id, task_name, correct, total, pct, date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(session.id, session.user_id, session.task_id, session.task_name, session.correct, session.total, session.pct, session.date);
}
