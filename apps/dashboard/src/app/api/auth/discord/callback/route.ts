import { NextRequest, NextResponse } from "next/server";
import {
  exchangeDiscordCode,
  fetchDiscordGuilds,
  fetchDiscordUser
} from "../../../../../lib/discord";
import { loadDashboardEnv } from "../../../../../lib/env";
import { encodeSession } from "../../../../../lib/session";

export async function GET(request: NextRequest) {
  const env = loadDashboardEnv();
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = request.cookies.get("lunaria_oauth_state")?.value;

  if (!code || !state || !cookieState || state !== cookieState) {
    return NextResponse.redirect(new URL("/?auth=failed", request.url));
  }

  const token = await exchangeDiscordCode({
    code,
    clientId: env.DISCORD_CLIENT_ID,
    clientSecret: env.DISCORD_CLIENT_SECRET,
    callbackUrl: env.DISCORD_CALLBACK_URL
  });
  const [user, guilds] = await Promise.all([
    fetchDiscordUser(token.access_token),
    fetchDiscordGuilds(token.access_token)
  ]);

  const manageableGuilds = guilds.filter((guild) => guild.manageable);
  const response = NextResponse.redirect(new URL("/", request.url));
  response.cookies.set(
    "lunaria_session",
    encodeSession(
      {
        user: {
          id: user.id,
          username: user.username,
          globalName: user.global_name,
          avatar: user.avatar
        },
        guilds: manageableGuilds,
        createdAt: Date.now()
      },
      env.SESSION_SECRET
    ),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 8
    }
  );
  response.cookies.delete("lunaria_oauth_state");

  return response;
}

