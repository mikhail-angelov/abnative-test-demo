import jwt from 'jsonwebtoken';

const SECRET = process.env.AUTH_SECRET || 'abnative-dev-secret-change-in-production';

export function signToken(payload: { id: string; email: string; role: string }): string {
  return jwt.sign(payload, SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): { id: string; email: string; role: string } | null {
  try {
    return jwt.verify(token, SECRET) as { id: string; email: string; role: string };
  } catch {
    return null;
  }
}
