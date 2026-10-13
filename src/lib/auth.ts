import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { all, get, run } from "./db";

export interface SessionUser {
  id: number;
  business_id: number;
  name: string;
  phone: string;
  role: "owner" | "staff";
}

const COOKIE = "billnova_session";

export async function createSession(userId: number): Promise<string> {
  const id = randomBytes(24).toString("hex");
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
  await run(
    "INSERT INTO session (id, user_id, expires_at) VALUES (?,?,?)",
    id,
    userId,
    expires,
  );
  const jar = await cookies();
  jar.set(COOKIE, id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return id;
}

export async function destroySession() {
  const jar = await cookies();
  const id = jar.get(COOKIE)?.value;
  if (id) await run("DELETE FROM session WHERE id = ?", id);
  jar.delete(COOKIE);
}

export async function currentUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const id = jar.get(COOKIE)?.value;
  if (!id) return null;

  const row = await get<SessionUser & { expires_at: string }>(
    `SELECT u.id, u.business_id, u.name, u.phone, u.role, s.expires_at
       FROM session s JOIN app_user u ON u.id = s.user_id
      WHERE s.id = ? AND u.is_active = 1`,
    id,
  );
  if (!row) return null;
  if (new Date(row.expires_at) < new Date()) {
    await run("DELETE FROM session WHERE id = ?", id);
    return null;
  }
  return {
    id: row.id,
    business_id: row.business_id,
    name: row.name,
    phone: row.phone,
    role: row.role,
  };
}

/** Every page and action calls this. No user, no data. */
export async function requireUser(): Promise<SessionUser> {
  const u = await currentUser();
  if (!u) throw new Error("NOT_AUTHENTICATED");
  return u;
}

export async function purgeExpiredSessions() {
  await run("DELETE FROM session WHERE expires_at < datetime('now')");
}

export async function listUsers(businessId: number) {
  return await all<{
    id: number;
    name: string;
    phone: string;
    role: string;
    is_active: number;
  }>(
    "SELECT id, name, phone, role, is_active FROM app_user WHERE business_id = ? ORDER BY role, name",
    businessId,
  );
}
