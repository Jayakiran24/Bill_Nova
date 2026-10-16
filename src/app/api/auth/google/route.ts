import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { OAUTH_STATE_COOKIE, googleRedirectUri } from "@/lib/google";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // role is only given when signing up; a plain "Continue with Google" on the login page signs in.
  const rp = req.nextUrl.searchParams.get("role");
  const roleParam = rp === "owner" || rp === "staff" ? rp : "login";
  const back = roleParam === "login" ? "/login" : `/signup?role=${roleParam}`;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId || !process.env.GOOGLE_CLIENT_SECRET) {
    return NextResponse.redirect(
      new URL(`${back}${back.includes("?") ? "&" : "?"}error=` + encodeURIComponent("Google sign-in isn't configured yet."), req.nextUrl.origin),
    );
  }
  // The chosen role rides inside the signed-by-cookie state so the callback knows it.
  const state = `${randomBytes(16).toString("hex")}.${roleParam}`;
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", googleRedirectUri(req));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");

  const res = NextResponse.redirect(url);
  res.cookies.set(OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
