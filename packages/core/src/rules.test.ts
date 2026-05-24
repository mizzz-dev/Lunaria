import { describe, expect, it } from "vitest";
import { InMemoryAuditLogStore } from "./audit.js";
import { RuleEngine, type MessageCreateEvent, type RuleDefinition } from "./rules.js";

const baseEvent: MessageCreateEvent = {
  type: "messageCreate",
  guildId: "guild-1",
  channelId: "channel-1",
  authorId: "user-1",
  authorRoleIds: ["role-1"],
  content: "hello lunaria",
  isBot: false,
  createdAt: new Date("2026-05-24T00:00:00.000Z")
};

const keywordRule: RuleDefinition = {
  id: "rule-1",
  pluginId: "autoresponder",
  name: "Lunaria hello",
  enabled: true,
  trigger: "messageCreate",
  conditions: [{ type: "keyword", value: "lunaria" }],
  actions: [{ type: "reply", content: "Lunaria is listening." }]
};

describe("RuleEngine", () => {
  it("evaluates messageCreate keyword rules into actions", async () => {
    const engine = new RuleEngine({ rules: [keywordRule] });

    const result = await engine.evaluate(baseEvent);

    expect(result.matchedRuleIds).toEqual(["rule-1"]);
    expect(result.actions).toEqual([{ type: "reply", content: "Lunaria is listening." }]);
  });

  it("prevents bot loops by default", async () => {
    const engine = new RuleEngine({ rules: [keywordRule] });

    const result = await engine.evaluate({
      ...baseEvent,
      isBot: true
    });

    expect(result.matchedRuleIds).toEqual([]);
    expect(result.actions).toEqual([]);
  });

  it("applies per-user cooldowns", async () => {
    let now = new Date("2026-05-24T00:00:00.000Z");
    const engine = new RuleEngine({
      rules: [
        {
          ...keywordRule,
          cooldown: {
            scope: "user",
            seconds: 60
          }
        }
      ],
      now: () => now
    });

    expect((await engine.evaluate(baseEvent)).matchedRuleIds).toEqual(["rule-1"]);
    expect((await engine.evaluate(baseEvent)).matchedRuleIds).toEqual([]);

    now = new Date("2026-05-24T00:01:01.000Z");
    expect((await engine.evaluate(baseEvent)).matchedRuleIds).toEqual(["rule-1"]);
  });

  it("writes audit actions to the configured audit log store", async () => {
    const auditLogStore = new InMemoryAuditLogStore();
    const engine = new RuleEngine({
      rules: [
        {
          ...keywordRule,
          actions: [
            {
              type: "auditLog",
              eventType: "rule.keyword.matched",
              data: { ruleId: keywordRule.id }
            }
          ]
        }
      ],
      auditLogStore
    });

    await engine.evaluate(baseEvent);

    const records = await auditLogStore.listByGuild("guild-1");
    expect(records).toHaveLength(1);
    expect(records[0]?.type).toBe("rule.keyword.matched");
  });
});
