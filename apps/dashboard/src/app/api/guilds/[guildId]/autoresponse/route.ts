import {
  AUTO_RESPONSE_PLUGIN_ID,
  autoResponsePlugin,
  buildAutoResponseRule,
  GuildPluginService,
  isAutoResponseConfig,
  PluginRegistry,
  type AutoResponseConfig
} from "@lunaria/core";
import {
  prisma,
  PrismaAuditLogStore,
  PrismaGuildPluginSettingsStore,
  PrismaRuleStore
} from "@lunaria/db";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireManageableGuild } from "../../../../../lib/auth";

const autoResponseInputSchema = z.object({
  enabled: z.boolean(),
  keyword: z.string().trim().min(1).max(80),
  response: z.string().trim().min(1).max(1800),
  channelId: z.string().trim().max(32).optional(),
  cooldownSeconds: z.coerce.number().int().min(0).max(86400),
  mentionAuthor: z.boolean()
});

type RouteContext = {
  params: Promise<{
    guildId: string;
  }>;
};

function createPluginService() {
  const registry = new PluginRegistry();
  registry.register(autoResponsePlugin);

  return new GuildPluginService(
    registry,
    new PrismaGuildPluginSettingsStore(prisma)
  );
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { guildId } = await context.params;

  try {
    await requireManageableGuild(guildId);
    const settingsStore = new PrismaGuildPluginSettingsStore(prisma);
    const settings = await settingsStore.get(guildId, AUTO_RESPONSE_PLUGIN_ID);
    const config = settings?.config;

    return NextResponse.json({
      enabled: settings?.enabled ?? false,
      config: isAutoResponseConfig(config)
        ? config
        : {
            keyword: "こんにちは",
            response: "こんにちは、Lunariaです。",
            channelId: "",
            cooldownSeconds: 30,
            mentionAuthor: false
          }
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { guildId } = await context.params;

  try {
    const session = await requireManageableGuild(guildId);
    const input = autoResponseInputSchema.parse(await request.json());
    const config: AutoResponseConfig = {
      keyword: input.keyword,
      response: input.response,
      cooldownSeconds: input.cooldownSeconds,
      mentionAuthor: input.mentionAuthor,
      ...(input.channelId ? { channelId: input.channelId } : {})
    };

    const pluginService = createPluginService();
    const ruleStore = new PrismaRuleStore(prisma);
    const auditLogStore = new PrismaAuditLogStore(prisma);

    const settings = await pluginService.setEnabled({
      guildId,
      pluginId: AUTO_RESPONSE_PLUGIN_ID,
      enabled: input.enabled,
      config,
      actorUserId: session.user.id
    });

    const rule = await ruleStore.upsert(
      guildId,
      buildAutoResponseRule({
        guildId,
        enabled: input.enabled,
        config
      })
    );

    await auditLogStore.append({
      guildId,
      pluginId: AUTO_RESPONSE_PLUGIN_ID,
      type: "autoresponse.config.updated",
      actorUserId: session.user.id,
      data: {
        enabled: input.enabled,
        keyword: input.keyword,
        channelId: input.channelId ?? null,
        cooldownSeconds: input.cooldownSeconds
      }
    });

    return NextResponse.json({
      ok: true,
      settings,
      rule
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "VALIDATION_FAILED",
          issues: error.issues
        },
        { status: 400 }
      );
    }

    return authErrorResponse(error);
  }
}

function authErrorResponse(error: unknown) {
  if (error instanceof Error && error.message === "UNAUTHENTICATED") {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  if (error instanceof Error && error.message === "FORBIDDEN") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  console.error(error);
  return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
}
