import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
const secret = new TextEncoder().encode(process.env.AUTH_SECRET || 'dev-secret-change-me');
const COOKIE = 'seminar_admin';
export async function createAdminSession(adminId) {
  const token = await new SignJWT({ sub: adminId, role: 'ADMIN' }).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('7d').sign(secret);
  const store = await cookies();
  store.set(COOKIE, token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 7 });
}
export async function getAdmin() {
  try { const token = (await cookies()).get(COOKIE)?.value; if (!token) return null; const { payload } = await jwtVerify(token, secret); return payload.role === 'ADMIN' ? { id: payload.sub } : null; } catch { return null; }
}
export async function clearAdminSession() { (await cookies()).delete(COOKIE); }
