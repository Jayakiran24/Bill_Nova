import { NextRequest, NextResponse } from "next/server";
import { get } from "@/lib/db";
import { createSession, createOwnerAccount, createStaffAccount, pendingInvite } from "@/lib/auth";
import { OAUTH_STATE_COOKIE, googleRedirectUri } from "@/lib/google";

export const dynamic = "force-dynamic";

function fail(req: NextRequest, msg: string, role?: string) {
  const page = role === "owner" || role === "staff" ? `/signup?role=${role}&` : "/login?";
  const res = NextResponse.redirect(
    new URL(`${page}error=` + encodeURIComponent(msg), req.nextUrl.origin),
  );
  res.cookies.delete(OAUTH_STATE_COOKIE);
  return res;
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const saved = req.cookies.get(OAUTH_STATE_COOKIE)?.value;
  const role = state?.split(".")[1];
  if (role !== "owner" && role !== "staff" && role !== "login")
    return fail(req, "Google sign-in failed. Please try again.");
  if (req.nextUrl.searchParams.get("error")) return fail(req, "Google sign-in was cancelled.", role);
  if (!code || !state || !saved || state !== saved)
    return fail(req, "Google sign-in failed. Please try again.", role);

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return fail(req, "Google sign-in isn't configured yet.", role);

  let claims: { sub?: string; aud?: string; email?: string; email_verified?: boolean; name?: string };
  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: googleRedirectUri(req),
        grant_type: "authorization_code",
      }),
    });
    if (!tokenRes.ok) return fail(req, "Google sign-in failed. Please try again.", role);
    const { id_token } = (await tokenRes.json()) as { id_token?: string };
    if (!id_token) return fail(req, "Google sign-in failed. Please try again.", role);
    // The token came straight from Google's token endpoint over TLS, so it is trusted.
    claims = JSON.parse(Buffer.from(id_token.split(".")[1], "base64url").toString());
  } catch {
    return fail(req, "Google sign-in failed. Please try again.", role);
  }

  const email = claims.email?.toLowerCase();
  if (!claims.sub || claims.aud !== clientId || !email || !claims.email_verified)
    return fail(req, "Your Google email is not verified.", role);

  const existing = await get<{ id: number; google_id: string | null; is_active: number; role: string }>(
    "SELECT id, google_id, is_active, role FROM app_user WHERE google_id = ? OR email = ?",
    claims.sub,
    email,
  );

  let userId: number;
  if (existing) {
    // Never auto-link Google to a password account that already owns this email.
    if (existing.google_id !== claims.sub)
      return fail(req, "That email already has a password account. Sign in with your password.", role);
    if (!existing.is_active) return fail(req, "This account is disabled.", role);
    userId = existing.id;
  } else {
    if (role === "login") return fail(req, "No account found for that Google email. Create an account first.");
    const name = claims.name?.trim() || email.split("@")[0];
    if (role === "staff") {
      if (!(await pendingInvite(email)))
        return fail(
          req,
          "No staff invitation found for this Google email. Ask the shop owner to add you under Settings → Staff.",
          role,
        );
      userId = await createStaffAccount({ name, email, googleId: claims.sub });
    } else {
      userId = await createOwnerAccount({
        name,
        businessName: `${name}'s Business`,
        email,
        googleId: claims.sub,
      });
    }
  }

  await createSession(userId);
  const res = NextResponse.redirect(new URL("/", req.nextUrl.origin));
  res.cookies.delete(OAUTH_STATE_COOKIE);
  return res;
}
