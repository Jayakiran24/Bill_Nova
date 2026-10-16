import { cookies } from "next/headers";
import { createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { get, run } from "./db";
import { sendOtpMail } from "./mail";

export type OtpPurpose = "signup" | "login" | "reset";

const COOKIE = "billnova_otp";
export const OTP_TTL_MIN = 10;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_S = 30;
const MAX_SENDS_PER_HOUR = 5;

export interface Challenge {
  id: string;
  purpose: OtpPurpose;
  email: string;
  user_id: number | null;
  payload: string | null;
  code_hash: string;
  expires_at: string;
  attempts: number;
  resends: number;
  verified_at: string | null;
  consumed_at: string | null;
  last_sent_at: string;
}

function secret() {
  const s = process.env.AUTH_SECRET;
  if (s) return s;
  if (process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET is not set.");
  return "dev-only-secret";
}

function hashCode(id: string, code: string) {
  return createHmac("sha256", secret()).update(`${id}:${code}`).digest("hex");
}

const iso = (ms = 0) => new Date(Date.now() + ms).toISOString();
const newCode = () => String(randomInt(0, 1_000_000)).padStart(6, "0");

async function setCookie(id: string) {
  (await cookies()).set(COOKIE, id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: OTP_TTL_MIN * 60,
  });
}

export async function clearChallengeCookie() {
  (await cookies()).delete(COOKIE);
}

export async function currentChallenge(): Promise<Challenge | null> {
  const id = (await cookies()).get(COOKIE)?.value;
  if (!id) return null;
  const c = await get<Challenge>("SELECT * FROM otp_challenge WHERE id = ?", id);
  if (!c || c.consumed_at || c.expires_at < iso()) return null;
  return c;
}

export function parsePayload<T>(c: Challenge): T | null {
  try {
    return c.payload ? (JSON.parse(c.payload) as T) : null;
  } catch {
    return null;
  }
}

async function sendsLastHour(email: string) {
  const r = await get<{ n: number }>(
    "SELECT COALESCE(SUM(1 + resends), 0) AS n FROM otp_challenge WHERE email = ? AND created_at > ?",
    email,
    iso(-3600_000),
  );
  return Number(r?.n ?? 0);
}

/** Create a challenge, email the code, and remember it in a cookie. */
export async function startChallenge(input: {
  purpose: OtpPurpose;
  email: string;
  userId?: number;
  payload?: unknown;
}): Promise<{ error?: string }> {
  const email = input.email.toLowerCase();
  if ((await sendsLastHour(email)) >= MAX_SENDS_PER_HOUR)
    return { error: "Too many codes requested for this email. Try again in an hour." };

  const id = randomBytes(24).toString("hex");
  const code = newCode();
  await run(
    `INSERT INTO otp_challenge (id, purpose, email, user_id, payload, code_hash, expires_at, last_sent_at)
     VALUES (?,?,?,?,?,?,?,?)`,
    id,
    input.purpose,
    email,
    input.userId ?? null,
    input.payload ? JSON.stringify(input.payload) : null,
    hashCode(id, code),
    iso(OTP_TTL_MIN * 60_000),
    iso(),
  );
  try {
    await sendOtpMail(email, code, input.purpose, OTP_TTL_MIN);
  } catch (e) {
    console.error("OTP email failed", e);
    await run("DELETE FROM otp_challenge WHERE id = ?", id);
    return { error: "We couldn't send the verification email. Please try again shortly." };
  }
  await setCookie(id);
  return {};
}

export async function resendChallenge(): Promise<{ error?: string; ok?: boolean }> {
  const c = await currentChallenge();
  if (!c) return { error: "Your session expired. Please start again." };
  if (c.verified_at) return { error: "Already verified." };
  const wait = RESEND_COOLDOWN_S - (Date.now() - new Date(c.last_sent_at).getTime()) / 1000;
  if (wait > 0) return { error: `Please wait ${Math.ceil(wait)}s before requesting another code.` };
  if ((await sendsLastHour(c.email)) >= MAX_SENDS_PER_HOUR)
    return { error: "Too many codes requested. Try again in an hour." };

  const code = newCode();
  try {
    await sendOtpMail(c.email, code, c.purpose, OTP_TTL_MIN);
  } catch (e) {
    console.error("OTP email failed", e);
    return { error: "We couldn't send the email. Please try again shortly." };
  }
  await run(
    `UPDATE otp_challenge SET code_hash = ?, attempts = 0, resends = resends + 1,
            expires_at = ?, last_sent_at = ? WHERE id = ?`,
    hashCode(c.id, code),
    iso(OTP_TTL_MIN * 60_000),
    iso(),
    c.id,
  );
  return { ok: true };
}

/** Check a submitted code. On success the challenge is marked verified (not yet consumed). */
export async function checkCode(rawCode: string): Promise<{ error?: string; challenge?: Challenge }> {
  const c = await currentChallenge();
  if (!c) return { error: "This code has expired. Please start again." };
  if (c.verified_at) return { challenge: c };
  if (c.attempts >= MAX_ATTEMPTS) return { error: "Too many wrong attempts. Request a new code." };
  const code = rawCode.replace(/\s/g, "");
  if (!/^\d{6}$/.test(code)) return { error: "Enter the 6-digit code." };

  const a = Buffer.from(hashCode(c.id, code), "hex");
  const b = Buffer.from(c.code_hash, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    await run("UPDATE otp_challenge SET attempts = attempts + 1 WHERE id = ?", c.id);
    const left = MAX_ATTEMPTS - c.attempts - 1;
    return {
      error:
        left > 0
          ? `Wrong code. ${left} attempt${left === 1 ? "" : "s"} left.`
          : "Too many wrong attempts. Request a new code.",
    };
  }
  await run("UPDATE otp_challenge SET verified_at = ? WHERE id = ?", iso(), c.id);
  return { challenge: { ...c, verified_at: iso() } };
}

/** Single-use: returns false if it was already consumed or never verified. */
export async function consumeChallenge(id: string): Promise<boolean> {
  const r = await run(
    "UPDATE otp_challenge SET consumed_at = ? WHERE id = ? AND consumed_at IS NULL AND verified_at IS NOT NULL",
    iso(),
    id,
  );
  await clearChallengeCookie();
  return r.changes === 1;
}

/* Password-attempt throttling, per identifier. */
const LOGIN_WINDOW_MS = 15 * 60_000;
const LOGIN_MAX_FAILS = 8;

export async function loginLocked(identifier: string): Promise<boolean> {
  const r = await get<{ n: number }>(
    "SELECT COUNT(*) AS n FROM login_failure WHERE identifier = ? AND at > ?",
    identifier.toLowerCase(),
    iso(-LOGIN_WINDOW_MS),
  );
  return Number(r?.n ?? 0) >= LOGIN_MAX_FAILS;
}
export async function recordLoginFailure(identifier: string) {
  await run("INSERT INTO login_failure (identifier, at) VALUES (?,?)", identifier.toLowerCase(), iso());
}
export async function clearLoginFailures(identifier: string) {
  await run("DELETE FROM login_failure WHERE identifier = ?", identifier.toLowerCase());
}

/** Looks identical to a real challenge but no code was ever sent, so nothing can match it. */
export async function startFakeChallenge(email: string) {
  const id = randomBytes(24).toString("hex");
  await run(
    `INSERT INTO otp_challenge (id, purpose, email, code_hash, expires_at, last_sent_at, attempts)
     VALUES (?, 'reset', ?, ?, ?, ?, 0)`,
    id,
    email.toLowerCase(),
    randomBytes(32).toString("hex"),
    iso(OTP_TTL_MIN * 60_000),
    iso(),
  );
  await setCookie(id);
}
