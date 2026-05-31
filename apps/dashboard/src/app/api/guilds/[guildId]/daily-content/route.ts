import {
  DAILY_CONTENT_PLUGIN_ID,
  dailyContentPlugin,
  GuildPluginService,
  isDailyContentConfig,
  PluginRegistry,
  type DailyContentConfig
} from "@lunaria/core";
import {
  prisma,
  PrismaAuditLogStore,
  PrismaGuildPluginSettingsStore
} from "@lunaria/db";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireManageableGuild } from "../../../../../lib/auth";

const dailyContentSlotSchema = z.enum(["quote", "question", "mission"]);

const dailyContentTemplateInputSchema = z.object({
  slot: dailyContentSlotSchema,
  template: z.string().min(1).max(1800)
}).strict();

const dailyContentScheduleInputSchema = z.object({
  id: z.string().trim().min(1).max(120).regex(/^[A-Za-z0-9_-]+$/),
  channelId: z.string().trim().min(1).max(32),
  timezone: z.string().trim().refine((value) => {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
      return true;
    } catch {
      return false;
    }
  }),
  postingTime: z.string().trim().regex(/^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/),
  content: z.array(dailyContentTemplateInputSchema).min(1).max(3)
}).strict();

const dailyContentInputSchema = z.object({
  enabled: z.boolean(),
  schedules: z.array(dailyContentScheduleInputSchema).max(20)
}).strict();

type RouteContext = {
  params: Promise<{
    guildId: string;
  }>;
};

function createPluginService() {
  const registry = new PluginRegistry();
  registry.register(dailyContentPlugin);

  return new GuildPluginService(
    registry,
    new PrismaGuildPluginSettingsStore(prisma)
  );
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { guildId } = await context.params;

  try {
    await requireManageableGuild(guildId);
    const settings = await new PrismaGuildPluginSettingsStore(prisma).get(
      guildId,
      DAILY_CONTENT_PLUGIN_ID
    );
    const config = settings?.config;

    return NextResponse.json({
      configured: Boolean(settings),
      enabled: settings?.enabled ?? false,
      schedules: isDailyContentConfig(config) ? config.schedules : []
    });
  } catch (error) {
    return dailyContentErrorResponse(error);
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { guildId } = await context.params;

  try {
    const session = await requireManageableGuild(guildId);
    const input = dailyContentInputSchema.parse(await request.json());
    const config: DailyContentConfig = {
      schedules: input.schedules
    };

    if (!isDailyContentConfig(config)) {
      return validationErrorResponse();
    }

    const settings = await createPluginService().setEnabled({
      guildId,
      pluginId: DAILY_CONTENT_PLUGIN_ID,
      enabled: input.enabled,
      config,
      actorUserId: session.user.id
    });

    await new PrismaAuditLogStore(prisma).append({
      guildId,
      pluginId: DAILY_CONTENT_PLUGIN_ID,
      type: "daily_content.config.updated",
      actorUserId: session.user.id,
      data: {
        enabled: input.enabled,
        scheduleCount: input.schedules.length,
        schedules: input.schedules.map((schedule) => ({
          id: schedule.id,
          channelId: schedule.channelId,
          timezone: schedule.timezone,
          postingTime: schedule.postingTime,
          contentSlots: schedule.content.map((entry) => entry.slot)
        }))
      }
    });

    return NextResponse.json({
      ok: true,
      settings: {
        guildId: settings.guildId,
        pluginId: settings.pluginId,
        enabled: settings.enabled,
        updatedByUserId: settings.updatedByUserId,
        updatedAt: settings.updatedAt
      }
    });
  } catch (error) {
    return dailyContentErrorResponse(error);
  }
}

function validationErrorResponse() {
  return NextResponse.json({ error: "VALIDATION_FAILED" }, { status: 400 });
}

function dailyContentErrorResponse(error: unknown) {
  if (
    error instanceof z.ZodError ||
    (error instanceof Error && error.message.startsWith("Invalid config for plugin:"))
  ) {
    return validationErrorResponse();
  }

  if (error instanceof Error && error.message === "UNAUTHENTICATED") {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  if (error instanceof Error && error.message === "FORBIDDEN") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  console.error(error);
  return NextResponse.json({ error: "INTERNAL_SERVER_ERROR" }, { status: 500 });
}
