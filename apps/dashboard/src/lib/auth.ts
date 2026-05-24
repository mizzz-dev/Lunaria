import { cookies } from "next/headers";
import { loadDashboardEnv } from "./env";
import { canManageGuild, decodeSession, type DashboardSession } from "./session";

export async function getDashboardSession(): Promise<DashboardSession | null> {
  const env = loadDashboardEnv();
  const cookieStore = await cookies();
  return decodeSession(cookieStore.get("lunaria_session")?.value, env.SESSION_SECRET);
}

export async function requireManageableGuild(guildId: string): Promise<DashboardSession> {
  const session = await getDashboardSession();

  if (!session) {
    throw new Error("UNAUTHENTICATED");
  }

  const guild = session.guilds.find((candidate) => candidate.id === guildId);

  if (!guild || !canManageGuild(guild.permissions, guild.owner)) {
    throw new Error("FORBIDDEN");
  }

  return session;
}
