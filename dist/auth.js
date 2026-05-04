"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findUserByEmail = findUserByEmail;
exports.findUserById = findUserById;
exports.createUser = createUser;
exports.validatePassword = validatePassword;
const db_1 = require("./db");
function findUserByEmail(email) {
    const db = (0, db_1.getDb)();
    return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
}
function findUserById(id) {
    const db = (0, db_1.getDb)();
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}
function createUser(name, email, password, role = 'user') {
    const db = (0, db_1.getDb)();
    const id = 'u' + Date.now();
    const bcrypt = require('bcryptjs');
    const hash = bcrypt.hashSync(password, 10);
    db.prepare('INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)').run(id, name, email, hash, role);
    return { id, name, email, password: hash, role };
}
function validatePassword(password, hash) {
    const bcrypt = require('bcryptjs');
    return bcrypt.compareSync(password, hash);
}
