import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { buildDiscordAuthorizeUrl } from "../../../../../lib/discord";
import { loadDashboardEnv } from "../../../../../lib/env";

export function GET() {
  const env = loadDashboardEnv();
  const state = randomBytes(24).toString("base64url");
  const response = NextResponse.redirect(
    buildDiscordAuthorizeUrl({
      clientId: env.DISCORD_CLIENT_ID,
      callbackUrl: env.DISCORD_CALLBACK_URL,
      state
    })
  );

  response.cookies.set("lunaria_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10
  });

  return response;
}

