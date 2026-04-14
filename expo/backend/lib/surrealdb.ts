import Surreal from 'surrealdb.js';

let db: Surreal | null = null;

export async function initSurrealDB() {
  if (db) return db;

  try {
    db = new Surreal();
    
    const endpoint = process.env.EXPO_PUBLIC_RORK_DB_ENDPOINT;
    const namespace = process.env.EXPO_PUBLIC_RORK_DB_NAMESPACE;
    const token = process.env.EXPO_PUBLIC_RORK_DB_TOKEN;

    if (!endpoint || !namespace || !token) {
      throw new Error('Missing SurrealDB configuration');
    }

    await db.connect(endpoint, {
      namespace,
      database: namespace,
      auth: token,
    });

    console.log('[SurrealDB] Connected successfully');
    return db;
  } catch (error) {
    console.error('[SurrealDB] Connection error:', error);
    throw error;
  }
}

export async function getSurrealDB() {
  if (!db) {
    await initSurrealDB();
  }
  return db!;
}

export interface User {
  [key: string]: unknown;
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: number;
}
