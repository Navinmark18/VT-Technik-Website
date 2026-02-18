import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const dbFile = process.env.DB_FILE || "./data/event-vt.sqlite";
const resolvedPath = path.resolve(dbFile);
fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });

const db = new Database(resolvedPath);
db.pragma("journal_mode = WAL");

// Initialize schema
const schemaPath = path.resolve("sql/schema.sql");
if (fs.existsSync(schemaPath)) {
  const schema = fs.readFileSync(schemaPath, "utf-8");
  db.exec(schema);
}

export function query(text, params = []) {
  const statement = db.prepare(text);
  if (/^\s*select/i.test(text)) {
    return { rows: statement.all(params) };
  }

  const info = statement.run(params);
  return { rows: [], info };
}

export function insertAndGetId(text, params = []) {
  const info = db.prepare(text).run(params);
  return Number(info.lastInsertRowid);
}

export function close() {
  db.close();
}
