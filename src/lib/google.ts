import type { NextRequest } from "next/server";

export const OAUTH_STATE_COOKIE = "billnova_oauth_state";

export function googleRedirectUri(req: NextRequest) {
  return process.env.GOOGLE_REDIRECT_URI || `${req.nextUrl.origin}/api/auth/google/callback`;
}
