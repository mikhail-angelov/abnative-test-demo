"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllTasks = getAllTasks;
exports.getTaskById = getTaskById;
exports.saveTask = saveTask;
exports.deleteTask = deleteTask;
const db_1 = require("./db");
function getAllTasks() {
    const db = (0, db_1.getDb)();
    const rows = db.prepare('SELECT * FROM tasks ORDER BY name').all();
    return rows.map(r => ({
        id: r.id,
        name: r.name,
        description: r.description,
        numQuestions: r.num_questions,
        questions: JSON.parse(r.data)
    }));
}
function getTaskById(id) {
    const db = (0, db_1.getDb)();
    const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    if (!row)
        return undefined;
    return {
        id: row.id,
        name: row.name,
        description: row.description,
        numQuestions: row.num_questions,
        questions: JSON.parse(row.data)
    };
}
function saveTask(task) {
    const db = (0, db_1.getDb)();
    db.prepare('INSERT OR REPLACE INTO tasks (id, name, description, num_questions, data) VALUES (?, ?, ?, ?, ?)').run(task.id, task.name, task.description, task.numQuestions, JSON.stringify(task.questions));
}
function deleteTask(id) {
    const db = (0, db_1.getDb)();
    db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
}
