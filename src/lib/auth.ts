import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { all, get, run, tx, hashPassword } from "./db";

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

/** Owner-only actions and pages call this. Staff get an error / are sent home. */
export async function requireOwner(): Promise<SessionUser> {
  const u = await requireUser();
  if (u.role !== "owner") throw new Error("OWNER_ONLY");
  return u;
}

export async function pendingInvite(email: string) {
  return await get<{ id: number; business_id: number; name: string | null }>(
    "SELECT id, business_id, name FROM staff_invite WHERE email = ? AND accepted_at IS NULL ORDER BY id DESC",
    email.toLowerCase(),
  );
}

/** Staff join an existing business through an owner's invitation (matched by email). */
export async function createStaffAccount(input: {
  name: string;
  email: string;
  passwordHash?: string;
  googleId?: string;
}): Promise<number> {
  const email = input.email.toLowerCase();
  return await tx(async () => {
    const invite = await pendingInvite(email);
    if (!invite) throw new Error("NO_INVITE");
    const u = await run(
      "INSERT INTO app_user (business_id, name, phone, password_hash, role, email, google_id) VALUES (?,?,?,?,'staff',?,?)",
      invite.business_id,
      input.name,
      `email-${randomBytes(8).toString("hex")}`,
      input.passwordHash ?? "!",
      email,
      input.googleId ?? null,
    );
    await run("UPDATE staff_invite SET accepted_at = ? WHERE id = ?", new Date().toISOString(), invite.id);
    return u.lastInsertRowid;
  });
}

export async function purgeExpiredSessions() {
  await run("DELETE FROM session WHERE expires_at < datetime('now')");
}

/**
 * Self-service sign-up: a brand-new shop with its own empty data and an owner
 * account. Used by both the email form and Google sign-in.
 * Password accounts get a scrypt hash; Google accounts get "!" which can never match.
 */
export async function createOwnerAccount(input: {
  name: string;
  businessName: string;
  email: string;
  password?: string;
  passwordHash?: string;
  googleId?: string;
}): Promise<number> {
  return await tx(async () => {
    const b = await run(
      "INSERT INTO business (name, legal_name, email) VALUES (?,?,?)",
      input.businessName,
      input.businessName,
      input.email,
    );
    // phone is NOT NULL UNIQUE, so accounts without one get a unique placeholder.
    const phone = `email-${randomBytes(8).toString("hex")}`;
    const u = await run(
      "INSERT INTO app_user (business_id, name, phone, password_hash, role, email, google_id) VALUES (?,?,?,?,'owner',?,?)",
      b.lastInsertRowid,
      input.name,
      phone,
      input.passwordHash ?? (input.password ? hashPassword(input.password) : "!"),
      input.email,
      input.googleId ?? null,
    );
    return u.lastInsertRowid;
  });
}

export async function listUsers(businessId: number) {
  return await all<{
    id: number;
    name: string;
    phone: string;
    email: string | null;
    role: string;
    is_active: number;
  }>(
    "SELECT id, name, phone, email, role, is_active FROM app_user WHERE business_id = ? ORDER BY role, name",
    businessId,
  );
}
