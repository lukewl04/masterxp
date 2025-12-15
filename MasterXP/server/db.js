// server/db.js
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// DB file will be created as server/database.sqlite
const dbPath = path.join(__dirname, "database.sqlite");
const db = new Database(dbPath);

// Create users table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    auth0_id TEXT UNIQUE NOT NULL,
    xp INTEGER NOT NULL DEFAULT 0,
    level INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

export function findUserByAuth0Id(auth0Id) {
  const stmt = db.prepare("SELECT * FROM users WHERE auth0_id = ?");
  return stmt.get(auth0Id);
}

export function createUser({ auth0Id, xp = 0, level = 1 }) {
  const stmt = db.prepare(`
    INSERT INTO users (auth0_id, xp, level)
    VALUES (?, ?, ?)
  `);
  const info = stmt.run(auth0Id, xp, level);
  const select = db.prepare("SELECT * FROM users WHERE id = ?");
  return select.get(info.lastInsertRowid);
}

export function updateUserXP(auth0Id, xp, level) {
  const stmt = db.prepare(`
    UPDATE users
    SET xp = ?, level = ?
    WHERE auth0_id = ?
  `);
  stmt.run(xp, level, auth0Id);

  const select = db.prepare("SELECT * FROM users WHERE auth0_id = ?");
  return select.get(auth0Id);
}
