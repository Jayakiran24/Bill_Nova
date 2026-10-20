import { NextRequest, NextResponse } from "next/server";
import { get, run } from "@/lib/db";
import { startChallenge } from "@/lib/otp";
import { createOwnerAccount, createStaffAccount, pendingInvite } from "@/lib/auth";
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
    if (!existing.is_active) return fail(req, "This account is disabled.", role);
    // Google has verified this email, so it is safe to attach Google to the existing account.
    if (!existing.google_id)
      await run("UPDATE app_user SET google_id = ? WHERE id = ?", claims.sub, existing.id);
    else if (existing.google_id !== claims.sub)
      return fail(req, "This email is linked to a different Google account.", role);
    userId = existing.id;
  } else {
    if (role === "login")
      return fail(req, "No account found for that Google email. Create an account first.");
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

  // Second factor: a code emailed to the Google address, same as password sign-in.
  const r = await startChallenge({ purpose: "login", email, userId });
  if (r.error) return fail(req, r.error, role);
  const res = NextResponse.redirect(new URL("/verify", req.nextUrl.origin));
  res.cookies.delete(OAUTH_STATE_COOKIE);
  return res;
}
