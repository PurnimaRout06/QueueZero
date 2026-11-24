import crypto from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { getUserById } from './db';
import type { UserProfile } from '../src/types';

// Session signing secret from process.env with in-memory randomBytes(32) fallback
const SIGNING_SECRET =
  process.env.SESSION_SECRET && process.env.SESSION_SECRET.trim().length >= 16
    ? process.env.SESSION_SECRET.trim()
    : crypto.randomBytes(32).toString('hex');

interface TokenPayload {
  sub: string;
  email: string;
  exp: number;
}

export interface AuthenticatedRequest extends Request {
  user?: UserProfile;
}

function base64UrlEncode(input: string | Buffer): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlDecode(input: string): string {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((input.length + 3) % 4);
  return Buffer.from(padded, 'base64').toString('utf8');
}

export function signAuthToken(user: UserProfile): string {
  const payload: TokenPayload = {
    sub: user.id,
    email: user.email,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days
  };
  const headerB64 = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const data = `${headerB64}.${payloadB64}`;
  const sig = crypto.createHmac('sha256', SIGNING_SECRET).update(data).digest();
  return `${data}.${base64UrlEncode(sig)}`;
}

export function verifyAuthToken(token: string): TokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, sigB64] = parts;
    const data = `${headerB64}.${payloadB64}`;
    const expectedSig = base64UrlEncode(
      crypto.createHmac('sha256', SIGNING_SECRET).update(data).digest()
    );
    const a = Buffer.from(sigB64);
    const b = Buffer.from(expectedSig);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

    const payload = JSON.parse(base64UrlDecode(payloadB64)) as TokenPayload;
    if (!payload.sub || typeof payload.exp !== 'number' || payload.exp < Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }

  const token = authHeader.slice('Bearer '.length).trim();
  const verified = verifyAuthToken(token);
  if (!verified) {
    res.status(401).json({ error: 'Session expired or invalid token. Please sign in again.' });
    return;
  }

  const user = getUserById(verified.sub);
  if (!user) {
    res.status(401).json({ error: 'Account not found. Please sign in again.' });
    return;
  }

  req.user = user;
  next();
}
