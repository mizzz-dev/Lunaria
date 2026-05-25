import {
  AUTO_RESPONSE_PLUGIN_ID,
  autoResponseConfigFromRule,
  autoResponsePlugin,
  buildAutoResponseRules,
  diffAutoResponseConfig,
  GuildPluginService,
  hasAutoResponseConfigChanges,
  isAutoResponsePluginConfig,
  PluginRegistry,
  type AutoResponsePluginConfig,
  type AutoResponseRuleConfig
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

const autoResponseRuleInputSchema = z.object({
  id: z.string().trim().min(1).max(120).optional(),
  enabled: z.boolean(),
  keyword: z.string().trim().min(1).max(80),
  response: z.string().trim().min(1).max(1800),
  channelId: z.string().trim().max(32).optional(),
  cooldownSeconds: z.coerce.number().int().min(0).max(86400),
  mentionAuthor: z.boolean()
});

const autoResponseInputSchema = z.object({
  enabled: z.boolean(),
  rules: z.array(autoResponseRuleInputSchema).max(25)
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
    const ruleStore = new PrismaRuleStore(prisma);
    const settings = await settingsStore.get(guildId, AUTO_RESPONSE_PLUGIN_ID);
    const config = settings?.config;
    const storedRules = await ruleStore.listByGuildPlugin(guildId, AUTO_RESPONSE_PLUGIN_ID);
    const rules = storedRules
      .map((rule) => autoResponseConfigFromRule(rule))
      .filter((rule): rule is AutoResponseRuleConfig => Boolean(rule));
    const hasStoredConfig = isAutoResponsePluginConfig(config);
    const configRules: readonly AutoResponseRuleConfig[] = hasStoredConfig
      ? config.rules
      : [];

    return NextResponse.json({
      configured: Boolean(settings),
      enabled: settings?.enabled ?? false,
      rules: hasStoredConfig ? configRules : rules
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
    const rules = input.rules.map((rule): AutoResponseRuleConfig => ({
      id: rule.id || crypto.randomUUID(),
      enabled: rule.enabled,
      keyword: rule.keyword,
      response: rule.response,
      cooldownSeconds: rule.cooldownSeconds,
      mentionAuthor: rule.mentionAuthor,
      ...(rule.channelId ? { channelId: rule.channelId } : {})
    }));
    const config: AutoResponsePluginConfig = { rules };

    const pluginService = createPluginService();
    const settingsStore = new PrismaGuildPluginSettingsStore(prisma);
    const ruleStore = new PrismaRuleStore(prisma);
    const auditLogStore = new PrismaAuditLogStore(prisma);
    const previousSettings = await settingsStore.get(guildId, AUTO_RESPONSE_PLUGIN_ID);
    const previousStoredRules = await ruleStore.listByGuildPlugin(
      guildId,
      AUTO_RESPONSE_PLUGIN_ID
    );
    const previousRulesFromStore = previousStoredRules
      .map((rule) => autoResponseConfigFromRule(rule))
      .filter((rule): rule is AutoResponseRuleConfig => Boolean(rule));
    const previousConfigRules = isAutoResponsePluginConfig(previousSettings?.config)
      ? previousSettings.config.rules
      : previousRulesFromStore;
    const diff = diffAutoResponseConfig(
      previousSettings
        ? {
            enabled: previousSettings.enabled,
            rules: previousConfigRules
          }
        : undefined,
      {
        enabled: input.enabled,
        rules
      }
    );

    if (previousSettings && !hasAutoResponseConfigChanges(diff)) {
      return NextResponse.json({
        ok: true,
        changed: false,
        settings: previousSettings,
        rules: previousStoredRules
      });
    }

    const settings = await pluginService.setEnabled({
      guildId,
      pluginId: AUTO_RESPONSE_PLUGIN_ID,
      enabled: input.enabled,
      config,
      actorUserId: session.user.id
    });

    const savedRules = await ruleStore.replaceByGuildPlugin(
      guildId,
      AUTO_RESPONSE_PLUGIN_ID,
      buildAutoResponseRules({
        guildId,
        rules: rules.map((rule) => ({
          ...rule,
          enabled: input.enabled && rule.enabled
        }))
      })
    );

    await auditLogStore.append({
      guildId,
      pluginId: AUTO_RESPONSE_PLUGIN_ID,
      type: "autoresponse.config.updated",
      actorUserId: session.user.id,
      data: {
        created: diff.created,
        ...(diff.enabled ? { enabledChange: diff.enabled } : {}),
        ruleChanges: diff.ruleChanges,
        enabled: input.enabled,
        ruleCount: rules.length,
        enabledRuleCount: rules.filter((rule) => rule.enabled).length
      }
    });

    return NextResponse.json({
      ok: true,
      changed: true,
      settings,
      rules: savedRules,
      diff
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
