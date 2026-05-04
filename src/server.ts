import * as path from 'path';
import * as fs from 'fs';
import { createApp } from './app';
import { migrate } from './migrate';
import { seedDefaults } from './seed';
import { closeDb } from './db';

const PORT = parseInt(process.env.PORT || '3010', 10);

// Ensure data directory for file-based DB
const DATA_DIR = path.join(__dirname, '..', 'data');
const PUBLIC_DIR = path.join(__dirname, '..', 'public');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR, { recursive: true });

// Init DB (uses DB_PATH env or default :memory: from db.ts)
migrate();
seedDefaults();

const app = createApp();

const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Static files from: ${PUBLIC_DIR}`);
});

process.on('SIGINT', () => { closeDb(); process.exit(0); });
process.on('SIGTERM', () => { closeDb(); process.exit(0); });

export { app, server };
