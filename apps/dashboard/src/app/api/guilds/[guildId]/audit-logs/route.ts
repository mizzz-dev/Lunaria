import { prisma, PrismaAuditLogStore } from "@lunaria/db";
import { NextResponse, type NextRequest } from "next/server";
import { requireManageableGuild } from "../../../../../lib/auth";

type RouteContext = {
  params: Promise<{
    guildId: string;
  }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const { guildId } = await context.params;

  try {
    await requireManageableGuild(guildId);
    const auditLogStore = new PrismaAuditLogStore(prisma);
    const logs = await auditLogStore.listByGuild(guildId, 25);

    return NextResponse.json({
      logs: logs.map((log) => ({
        ...log,
        createdAt: log.createdAt.toISOString()
      }))
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHENTICATED") {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }

    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    console.error(error);
    return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
  }
}
