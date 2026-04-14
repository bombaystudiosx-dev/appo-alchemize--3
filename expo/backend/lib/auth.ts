import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getSurrealDB, type User } from './surrealdb';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.warn('[Auth] WARNING: JWT_SECRET not set. Using default for development only.');
}

const getJwtSecret = () => JWT_SECRET || 'alchemize-dev-secret-' + (process.env.EXPO_PUBLIC_PROJECT_ID || 'local');
const JWT_EXPIRES_IN = '30d';

export interface AuthTokenPayload {
  userId: string;
  email: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): AuthTokenPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as AuthTokenPayload;
  } catch {
    return null;
  }
}

export async function createUser(email: string, password: string, name: string) {
  const db = await getSurrealDB();
  
  const existing = await db.query('SELECT * FROM users WHERE email = $email', {
    email,
  }) as any[];

  if (existing[0]?.length > 0) {
    throw new Error('User already exists');
  }

  const passwordHash = await hashPassword(password);
  const userId = `users:${Date.now()}_${Math.random().toString(36).substring(7)}`;

  const result = await db.create('users', {
    id: userId,
    email,
    name,
    passwordHash,
    createdAt: Date.now(),
  });

  const user = result[0] as unknown as User;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    token: generateToken({ userId: user.id, email: user.email }),
  };
}

export async function loginUser(email: string, password: string) {
  const db = await getSurrealDB();

  const result = await db.query('SELECT * FROM users WHERE email = $email', {
    email,
  }) as any[];

  const users = result[0] as User[];
  if (!users || users.length === 0) {
    throw new Error('Invalid credentials');
  }

  const user = users[0];
  const isValid = await verifyPassword(password, user.passwordHash);

  if (!isValid) {
    throw new Error('Invalid credentials');
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    token: generateToken({ userId: user.id, email: user.email }),
  };
}

export async function getUserFromToken(token: string) {
  const payload = verifyToken(token);
  if (!payload) {
    return null;
  }

  const db = await getSurrealDB();
  const result = await db.select(payload.userId);

  if (!result || (Array.isArray(result) && result.length === 0)) {
    return null;
  }

  const user = (Array.isArray(result) ? result[0] : result) as unknown as User;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
  };
}
