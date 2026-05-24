import { describe, expect, it } from "vitest";
import {
  GuildPluginService,
  InMemoryGuildPluginSettingsStore,
  PluginRegistry,
  type PluginMetadata
} from "./plugins.js";

const quotePlugin: PluginMetadata = {
  id: "quote",
  name: "Quote",
  version: "0.1.0",
  description: "Collect and publish community quotes.",
  configSchema: {
    type: "object",
    required: ["enabledChannelIds"],
    additionalProperties: false,
    properties: {
      enabledChannelIds: {
        type: "array",
        items: { type: "string" },
        minItems: 1
      }
    }
  },
  permissions: [
    {
      permission: "quotes:manage",
      label: "Manage quotes",
      description: "Create, hide, edit, and delete quotes."
    }
  ],
  auditEvents: [
    {
      type: "quote.created",
      label: "Quote created",
      severity: "info"
    }
  ],
  pricing: {
    planKeys: ["free", "pro"],
    usageLimitKey: "quotes.monthly"
  },
  dependencies: []
};

describe("PluginRegistry", () => {
  it("registers plugin metadata and validates JSON Schema config", () => {
    const registry = new PluginRegistry();
    registry.register(quotePlugin);

    expect(registry.list()).toHaveLength(1);
    expect(
      registry.validateConfig("quote", {
        enabledChannelIds: ["123"]
      }).valid
    ).toBe(true);
    expect(
      registry.validateConfig("quote", {
        enabledChannelIds: []
      }).valid
    ).toBe(false);
  });
});

describe("GuildPluginService", () => {
  it("stores guild-scoped enabled state after config validation", async () => {
    const registry = new PluginRegistry();
    registry.register(quotePlugin);
    const store = new InMemoryGuildPluginSettingsStore();
    const service = new GuildPluginService(registry, store);

    await service.setEnabled({
      guildId: "guild-1",
      pluginId: "quote",
      enabled: true,
      config: { enabledChannelIds: ["channel-1"] },
      actorUserId: "owner-1"
    });

    const settings = await store.get("guild-1", "quote");
    expect(settings?.enabled).toBe(true);
    expect(settings?.updatedByUserId).toBe("owner-1");
  });
});
