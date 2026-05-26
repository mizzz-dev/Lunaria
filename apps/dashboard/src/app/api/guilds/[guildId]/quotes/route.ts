import { QuoteService, type QuoteSource, type RbacActor } from "@lunaria/core";
import { prisma, PrismaAuditLogStore, PrismaQuoteStore } from "@lunaria/db";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireManageableGuild } from "../../../../../lib/auth";

const quoteInputSchema = z.object({
  content: z.string().trim().min(1).max(2000),
  sourceMessageId: z.string().trim().min(1).max(32),
  sourceMessageUrl: z.string().url().max(300),
  sourceAuthorId: z.string().trim().min(1).max(32),
  sourceAuthorName: z.string().trim().min(1).max(120),
  sourceChannelId: z.string().trim().min(1).max(32),
  sourceChannelName: z.string().trim().min(1).max(120),
  sourceCreatedAt: z.coerce.date()
});

type RouteContext = {
  params: Promise<{
    guildId: string;
  }>;
};

export function createQuoteService(): QuoteService {
  return new QuoteService(
    new PrismaQuoteStore(prisma),
    new PrismaAuditLogStore(prisma)
  );
}

export function managedActor(guildId: string, userId: string): RbacActor {
  return {
    guildId,
    userId,
    roleKeys: ["admin"]
  };
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { guildId } = await context.params;

  try {
    await requireManageableGuild(guildId);
    const quotes = await createQuoteService().listVisible(guildId, 50);
    return NextResponse.json({ quotes });
  } catch (error) {
    return quoteErrorResponse(error);
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { guildId } = await context.params;

  try {
    const session = await requireManageableGuild(guildId);
    const input: QuoteSource = quoteInputSchema.parse(await request.json());
    const quote = await createQuoteService().add({
      actor: managedActor(guildId, session.user.id),
      guildId,
      quote: input
    });

    return NextResponse.json({ quote }, { status: 201 });
  } catch (error) {
    return quoteErrorResponse(error);
  }
}

export function quoteErrorResponse(error: unknown) {
  if (error instanceof z.ZodError || (error instanceof Error && error.message === "INVALID_QUOTE_SOURCE")) {
    return NextResponse.json({ error: "VALIDATION_FAILED" }, { status: 400 });
  }

  if (error instanceof Error && error.message === "UNAUTHENTICATED") {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  if (error instanceof Error && error.message === "FORBIDDEN") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  if (error instanceof Error && error.message === "QUOTE_NOT_FOUND") {
    return NextResponse.json({ error: "QUOTE_NOT_FOUND" }, { status: 404 });
  }

  console.error(error);
  return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
}
