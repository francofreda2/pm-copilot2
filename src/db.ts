import { createClient, Client } from '@libsql/client';

let client: Client | null = null;

export async function initDb() {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN;

  if (tursoUrl) {
    // Production: Turso remote DB
    client = createClient({ url: tursoUrl, authToken: tursoToken });
    console.log('Database connected (Turso remote)');
  } else {
    // Development: local SQLite file
    client = createClient({ url: 'file:database.sqlite' });
    console.log('Database connected (local SQLite)');
  }

  await client.execute(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  await client.execute(`CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    data TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);

  await client.execute(`CREATE TABLE IF NOT EXISTS incidents (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    data TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);

  console.log('Database initialized');
}

// Wrapper that mimics the old sqlite API so routes don't need changes
export function getDb() {
  if (!client) throw new Error('Database not initialized');

  return {
    async get(sql: string, params?: any[]) {
      const result = await client!.execute({ sql, args: params || [] });
      if (result.rows.length === 0) return undefined;
      const row = result.rows[0];
      const obj: any = {};
      result.columns.forEach((col, i) => { obj[col] = row[i]; });
      return obj;
    },
    async all(sql: string, params?: any[]) {
      const result = await client!.execute({ sql, args: params || [] });
      return result.rows.map(row => {
        const obj: any = {};
        result.columns.forEach((col, i) => { obj[col] = row[i]; });
        return obj;
      });
    },
    async run(sql: string, params?: any[]) {
      const result = await client!.execute({ sql, args: params || [] });
      return { lastID: Number(result.lastInsertRowid), changes: result.rowsAffected };
    },
    async exec(sql: string) {
      const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
      for (const stmt of statements) {
        await client!.execute(stmt);
      }
    }
  };
}
