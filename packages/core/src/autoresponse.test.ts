import { describe, expect, it } from "vitest";
import {
  AUTO_RESPONSE_PLUGIN_ID,
  autoResponsePlugin,
  autoResponseRuleId,
  buildAutoResponseRules,
  buildAutoResponseRule,
  diffAutoResponseConfig,
  hasAutoResponseConfigChanges
} from "./autoresponse.js";
import { PluginRegistry } from "./plugins.js";

describe("AutoResponse plugin", () => {
  it("provides plugin metadata with config validation", () => {
    const registry = new PluginRegistry();
    registry.register(autoResponsePlugin);

    expect(
      registry.validateConfig(AUTO_RESPONSE_PLUGIN_ID, {
        rules: [
          {
            id: "rule-1",
            enabled: true,
            keyword: "こんにちは",
            response: "こんにちは、Lunariaです。",
            cooldownSeconds: 30,
            mentionAuthor: false
          }
        ]
      }).valid
    ).toBe(true);

    expect(
      registry.validateConfig(AUTO_RESPONSE_PLUGIN_ID, {
        rules: [
          {
            id: "rule-1",
            enabled: true,
            keyword: "",
            response: "invalid",
            cooldownSeconds: 30,
            mentionAuthor: false
          }
        ]
      }).valid
    ).toBe(false);
  });

  it("builds a messageCreate rule from config", () => {
    const rule = buildAutoResponseRule({
      guildId: "guild-1",
      config: {
        id: "rule-1",
        enabled: true,
        keyword: "lunaria",
        response: "awake",
        channelId: "channel-1",
        cooldownSeconds: 15,
        mentionAuthor: false
      }
    });

    expect(rule.id).toBe(autoResponseRuleId("guild-1", "rule-1"));
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

  it("builds multiple messageCreate rules", () => {
    const rules = buildAutoResponseRules({
      guildId: "guild-1",
      rules: [
        {
          id: "hello",
          enabled: true,
          keyword: "hello",
          response: "world",
          cooldownSeconds: 0,
          mentionAuthor: false
        },
        {
          id: "bye",
          enabled: false,
          keyword: "bye",
          response: "moon",
          cooldownSeconds: 10,
          mentionAuthor: true
        }
      ]
    });

    expect(rules.map((rule) => rule.id)).toEqual([
      "autoresponse:guild-1:hello",
      "autoresponse:guild-1:bye"
    ]);
    expect(rules[1]?.enabled).toBe(false);
  });

  it("records added, removed and edited rule fields in a config diff", () => {
    const diff = diffAutoResponseConfig(
      {
        enabled: true,
        rules: [
          {
            id: "hello",
            enabled: true,
            keyword: "hello",
            response: "world",
            cooldownSeconds: 0,
            mentionAuthor: false
          },
          {
            id: "old",
            enabled: true,
            keyword: "old",
            response: "gone",
            cooldownSeconds: 0,
            mentionAuthor: false
          }
        ]
      },
      {
        enabled: false,
        rules: [
          {
            id: "hello",
            enabled: true,
            keyword: "hello",
            response: "moon",
            cooldownSeconds: 10,
            mentionAuthor: false
          },
          {
            id: "new",
            enabled: true,
            keyword: "new",
            response: "awake",
            cooldownSeconds: 0,
            mentionAuthor: true
          }
        ]
      }
    );

    expect(diff.enabled).toEqual({ before: true, after: false });
    expect(diff.ruleChanges.map((change) => [change.kind, change.ruleId])).toEqual([
      ["updated", "hello"],
      ["added", "new"],
      ["removed", "old"]
    ]);
    expect(diff.ruleChanges[0]?.fields).toEqual(["response", "cooldownSeconds"]);
    expect(hasAutoResponseConfigChanges(diff)).toBe(true);
  });

  it("recognizes a repeated save as unchanged", () => {
    const snapshot = {
      enabled: true,
      rules: [
        {
          id: "hello",
          enabled: true,
          keyword: "hello",
          response: "world",
          cooldownSeconds: 0,
          mentionAuthor: false
        }
      ]
    };

    const diff = diffAutoResponseConfig(snapshot, snapshot);

    expect(diff).toEqual({ created: false, ruleChanges: [] });
    expect(hasAutoResponseConfigChanges(diff)).toBe(false);
  });
});
