import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { loadDashboardEnv } from "../../../lib/env";
import { decodeSession } from "../../../lib/session";

export async function GET() {
  const env = loadDashboardEnv();
  const cookieStore = await cookies();
  const session = decodeSession(
    cookieStore.get("lunaria_session")?.value,
    env.SESSION_SECRET
  );

  return NextResponse.json({
    authenticated: Boolean(session),
    user: session?.user ?? null,
    guilds: session?.guilds ?? [],
    primaryGuildId: env.PRIMARY_GUILD_ID ?? null
  });
}

