import { describe, expect, it } from "vitest";
import {
  AUTO_RESPONSE_PLUGIN_ID,
  autoResponsePlugin,
  autoResponseRuleId,
  buildAutoResponseRule
} from "./autoresponse.js";
import { PluginRegistry } from "./plugins.js";

describe("AutoResponse plugin", () => {
  it("provides plugin metadata with config validation", () => {
    const registry = new PluginRegistry();
    registry.register(autoResponsePlugin);

    expect(
      registry.validateConfig(AUTO_RESPONSE_PLUGIN_ID, {
        keyword: "こんにちは",
        response: "こんにちは、Lunariaです。",
        cooldownSeconds: 30,
        mentionAuthor: false
      }).valid
    ).toBe(true);

    expect(
      registry.validateConfig(AUTO_RESPONSE_PLUGIN_ID, {
        keyword: "",
        response: "invalid",
        cooldownSeconds: 30,
        mentionAuthor: false
      }).valid
    ).toBe(false);
  });

  it("builds a messageCreate rule from config", () => {
    const rule = buildAutoResponseRule({
      guildId: "guild-1",
      enabled: true,
      config: {
        keyword: "lunaria",
        response: "awake",
        channelId: "channel-1",
        cooldownSeconds: 15,
        mentionAuthor: false
      }
    });

    expect(rule.id).toBe(autoResponseRuleId("guild-1"));
    expect(rule.pluginId).toBe(AUTO_RESPONSE_PLUGIN_ID);
    expect(rule.conditions).toEqual([
      {
        type: "keyword",
        value: "lunaria",
        mode: "contains",
        caseSensitive: false
      },
      {
        type: "channel",
        channelIds: ["channel-1"]
      }
    ]);
    expect(rule.actions[0]).toEqual({
      type: "reply",
      content: "awake",
      mentionAuthor: false
    });
  });
});
