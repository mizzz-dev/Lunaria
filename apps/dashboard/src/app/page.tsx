"use client";

import { type ChangeEvent, useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Bot,
  CalendarClock,
  ChevronDown,
  CheckCircle2,
  CircleDollarSign,
  Command,
  FileClock,
  Globe2,
  Languages,
  LockKeyhole,
  MessageSquareReply,
  Moon,
  Orbit,
  Plus,
  Plug,
  RadioTower,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Sun,
  TerminalSquare,
  Trash2,
  UsersRound,
  WandSparkles
} from "lucide-react";
import { clsx } from "clsx";

const navItems = [
  { label: "Overview", active: true, icon: Activity },
  { label: "Plugins", active: false, icon: Plug },
  { label: "Rules", active: false, icon: Command },
  { label: "Guilds", active: false, icon: UsersRound },
  { label: "Audit", active: false, icon: FileClock },
  { label: "Ops", active: false, icon: TerminalSquare }
];

const pluginCards = [
  { name: "AutoResponse", status: "Enabled", detail: "12 active rules", tone: "cyan" },
  { name: "Quote", status: "Enabled", detail: "38 saved quotes", tone: "violet" },
  {
    name: "Daily Content",
    status: "Configure",
    detail: "Guild schedules editable",
    tone: "blue",
    href: "#daily-content-settings"
  },
  { name: "LFG", status: "Enabled", detail: "3 open parties", tone: "mint" }
];

const dailyContentSlots = [
  {
    slot: "quote",
    label: "Quote",
    placeholder: "今日の名言: {quote}"
  },
  {
    slot: "question",
    label: "Question",
    placeholder: "今日の質問: いま一番遊びたいゲームは?"
  },
  {
    slot: "mission",
    label: "Mission",
    placeholder: "今日のミッション: VCで1人にありがとうを伝える"
  }
] as const;

const timezoneOptions = [
  "Asia/Tokyo",
  "UTC",
  "America/Los_Angeles",
  "America/New_York",
  "Europe/London",
  "Europe/Paris",
  "Australia/Sydney"
];

const rules = [
  {
    trigger: "messageCreate",
    condition: "regex + channel + cooldown",
    action: "reply / thread",
    state: "Live"
  },
  {
    trigger: "scheduledTime",
    condition: "weekday theme",
    action: "daily post",
    state: "Ready"
  },
  {
    trigger: "guildMemberAdd",
    condition: "new account",
    action: "moderation review",
    state: "Draft"
  }
];

const copy = {
  en: {
    search: "Search plugins, rules, audit logs",
    status: "Bot online as Lunaria#0377",
    title: "Game community operations, kept in lunar order.",
    description:
      "Manage plugins, rule workflows, moderation signals, and future server operations from one calm command surface.",
    createRule: "Create rule",
    reviewAudit: "Review audit",
    localeValue: "JA / EN",
    localeDetail: "dashboard shell prepared"
  },
  ja: {
    search: "プラグイン、ルール、監査ログを検索",
    status: "Bot online as Lunaria#0377",
    title: "ゲームコミュニティ運営を、月の秩序で整える。",
    description:
      "プラグイン、ルールワークフロー、モデレーション、将来のサーバー操作まで、落ち着いた管理画面で扱えます。",
    createRule: "ルール作成",
    reviewAudit: "監査を見る",
    localeValue: "日本語",
    localeDetail: "英語へ切替可能"
  }
} as const;

type MeResponse = {
  authenticated: boolean;
  user: {
    id: string;
    username: string;
    globalName: string | null;
    avatar: string | null;
  } | null;
  guilds: Array<{
    id: string;
    name: string;
    icon: string | null;
    owner: boolean;
    permissions: string;
    manageable: boolean;
  }>;
  primaryGuildId: string | null;
};

type AutoResponseRuleState = {
  id: string;
  enabled: boolean;
  keyword: string;
  response: string;
  channelId: string;
  cooldownSeconds: number;
  mentionAuthor: boolean;
};

type AutoResponseState = {
  enabled: boolean;
  rules: AutoResponseRuleState[];
};

type DailyContentSlot = (typeof dailyContentSlots)[number]["slot"];

type DailyContentTemplateState = {
  slot: DailyContentSlot;
  template: string;
};

type DailyContentScheduleState = {
  clientKey: string;
  id: string;
  channelId: string;
  timezone: string;
  postingTime: string;
  content: DailyContentTemplateState[];
};

type DailyContentState = {
  enabled: boolean;
  schedules: DailyContentScheduleState[];
};

type DailyContentStatus =
  | "idle"
  | "loading"
  | "saving"
  | "saved"
  | "validation-error"
  | "error";

type AuditLogItem = {
  id: string;
  pluginId: string;
  type: string;
  actorUserId: string;
  targetId?: string;
  data?: {
    enabledChange?: {
      before: boolean | null;
      after: boolean;
    };
    ruleChanges?: Array<{
      kind: "added" | "removed" | "updated";
      ruleId: string;
      fields: string[];
    }>;
    keyword?: string;
    scheduleCount?: number;
    schedules?: Array<{
      id: string;
      channelId: string;
      timezone: string;
      postingTime: string;
      contentSlots: DailyContentSlot[];
    }>;
  };
  createdAt: string;
};

type AuditCategory = "all" | "configuration" | "activity";

function createAutoResponseRule(
  overrides: Partial<AutoResponseRuleState> = {}
): AutoResponseRuleState {
  return {
    id:
      globalThis.crypto?.randomUUID?.() ??
      `rule-${Date.now()}-${Math.round(Math.random() * 1000)}`,
    enabled: true,
    keyword: "こんにちは",
    response: "こんにちは、Lunariaです。",
    channelId: "",
    cooldownSeconds: 30,
    mentionAuthor: false,
    ...overrides
  };
}

const defaultAutoResponse: AutoResponseState = {
  enabled: false,
  rules: [createAutoResponseRule({ id: "default" })]
};

function createDailyContentSchedule(
  overrides: Partial<DailyContentScheduleState> = {}
): DailyContentScheduleState {
  const fallbackId =
    globalThis.crypto?.randomUUID?.().slice(0, 13) ??
    `${Date.now()}-${Math.round(Math.random() * 1000)}`;

  return {
    clientKey: `schedule-${fallbackId}`,
    id: `daily-${fallbackId}`,
    channelId: "",
    timezone: "Asia/Tokyo",
    postingTime: "09:00",
    content: [
      {
        slot: "question",
        template: "今日の質問: いま一番遊びたいゲームは?"
      }
    ],
    ...overrides
  };
}

const defaultDailyContent: DailyContentState = {
  enabled: false,
  schedules: []
};

export default function DashboardPage() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [locale, setLocale] = useState<"ja" | "en">("ja");
  const [me, setMe] = useState<MeResponse | null>(null);
  const [selectedGuildId, setSelectedGuildId] = useState<string | null>(null);
  const [autoResponse, setAutoResponse] =
    useState<AutoResponseState>(defaultAutoResponse);
  const [autoResponseStatus, setAutoResponseStatus] = useState<
    "idle" | "loading" | "saving" | "saved" | "unchanged" | "error"
  >("idle");
  const [dailyContent, setDailyContent] =
    useState<DailyContentState>(defaultDailyContent);
  const [dailyContentStatus, setDailyContentStatus] =
    useState<DailyContentStatus>("idle");
  const [dailyContentValidationMessages, setDailyContentValidationMessages] =
    useState<string[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [auditStatus, setAuditStatus] = useState<
    "idle" | "loading" | "error"
  >("idle");
  const [auditCategory, setAuditCategory] = useState<AuditCategory>("all");
  const t = copy[locale];

  function handleGuildChange(event: ChangeEvent<HTMLSelectElement>) {
    setSelectedGuildId(event.currentTarget.value);
  }

  function updateAutoResponse<K extends keyof AutoResponseState>(
    key: K,
    value: AutoResponseState[K]
  ) {
    setAutoResponse((current) => ({
      ...current,
      [key]: value
    }));
  }

  function updateAutoResponseRule<K extends keyof AutoResponseRuleState>(
    ruleId: string,
    key: K,
    value: AutoResponseRuleState[K]
  ) {
    setAutoResponse((current) => ({
      ...current,
      rules: current.rules.map((rule) =>
        rule.id === ruleId ? { ...rule, [key]: value } : rule
      )
    }));
  }

  function addAutoResponseRule() {
    setAutoResponse((current) => ({
      ...current,
      rules: [
        ...current.rules,
        createAutoResponseRule({
          keyword: "",
          response: ""
        })
      ]
    }));
  }

  function removeAutoResponseRule(ruleId: string) {
    setAutoResponse((current) => ({
      ...current,
      rules: current.rules.filter((rule) => rule.id !== ruleId)
    }));
  }

  function updateDailyContent<K extends keyof DailyContentState>(
    key: K,
    value: DailyContentState[K]
  ) {
    setDailyContentValidationMessages([]);
    setDailyContentStatus((current) =>
      current === "validation-error" || current === "saved" ? "idle" : current
    );
    setDailyContent((current) => ({
      ...current,
      [key]: value
    }));
  }

  function updateDailyContentSchedule<K extends keyof DailyContentScheduleState>(
    clientKey: string,
    key: K,
    value: DailyContentScheduleState[K]
  ) {
    setDailyContentValidationMessages([]);
    setDailyContentStatus((current) =>
      current === "validation-error" || current === "saved" ? "idle" : current
    );
    setDailyContent((current) => ({
      ...current,
      schedules: current.schedules.map((schedule) =>
        schedule.clientKey === clientKey ? { ...schedule, [key]: value } : schedule
      )
    }));
  }

  function addDailyContentSchedule() {
    setDailyContentValidationMessages([]);
    setDailyContentStatus((current) =>
      current === "validation-error" || current === "saved" ? "idle" : current
    );
    setDailyContent((current) => ({
      ...current,
      schedules: [...current.schedules, createDailyContentSchedule()]
    }));
  }

  function removeDailyContentSchedule(clientKey: string) {
    setDailyContentValidationMessages([]);
    setDailyContentStatus((current) =>
      current === "validation-error" || current === "saved" ? "idle" : current
    );
    setDailyContent((current) => ({
      ...current,
      schedules: current.schedules.filter((schedule) => schedule.clientKey !== clientKey)
    }));
  }

  function setDailyContentSlotIncluded(
    clientKey: string,
    slot: DailyContentSlot,
    included: boolean
  ) {
    setDailyContentValidationMessages([]);
    setDailyContentStatus((current) =>
      current === "validation-error" || current === "saved" ? "idle" : current
    );
    setDailyContent((current) => ({
      ...current,
      schedules: current.schedules.map((schedule) => {
        if (schedule.clientKey !== clientKey) {
          return schedule;
        }

        const hasEntry = schedule.content.some((entry) => entry.slot === slot);

        if (included && !hasEntry) {
          return {
            ...schedule,
            content: [...schedule.content, { slot, template: "" }]
          };
        }

        if (!included) {
          return {
            ...schedule,
            content: schedule.content.filter((entry) => entry.slot !== slot)
          };
        }

        return schedule;
      })
    }));
  }

  function updateDailyContentTemplate(
    clientKey: string,
    slot: DailyContentSlot,
    template: string
  ) {
    setDailyContentValidationMessages([]);
    setDailyContentStatus((current) =>
      current === "validation-error" || current === "saved" ? "idle" : current
    );
    setDailyContent((current) => ({
      ...current,
      schedules: current.schedules.map((schedule) => {
        if (schedule.clientKey !== clientKey) {
          return schedule;
        }

        const hasEntry = schedule.content.some((entry) => entry.slot === slot);

        return {
          ...schedule,
          content: hasEntry
            ? schedule.content.map((entry) =>
                entry.slot === slot ? { ...entry, template } : entry
              )
            : [...schedule.content, { slot, template }]
        };
      })
    }));
  }

  async function saveAutoResponse() {
    if (!selectedGuildId) {
      return;
    }

    setAutoResponseStatus("saving");

    const response = await fetch(`/api/guilds/${selectedGuildId}/autoresponse`, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(autoResponse)
    });

    if (response.ok) {
      const result = (await response.json()) as { changed?: boolean };
      setAutoResponseStatus(result.changed === false ? "unchanged" : "saved");
      await loadAuditLogs(selectedGuildId, auditCategory);
    } else {
      setAutoResponseStatus("error");
    }
  }

  async function saveDailyContent() {
    if (!selectedGuildId) {
      return;
    }

    const validationMessages = validateDailyContent(dailyContent);

    if (validationMessages.length > 0) {
      setDailyContentValidationMessages(validationMessages);
      setDailyContentStatus("validation-error");
      return;
    }

    setDailyContentStatus("saving");
    setDailyContentValidationMessages([]);

    try {
      const response = await fetch(`/api/guilds/${selectedGuildId}/daily-content`, {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          enabled: dailyContent.enabled,
          schedules: dailyContent.schedules.map((schedule) => ({
            id: schedule.id.trim(),
            channelId: schedule.channelId.trim(),
            timezone: schedule.timezone.trim(),
            postingTime: schedule.postingTime.trim(),
            content: dailyContentSlots.flatMap(({ slot }) => {
              const entry = schedule.content.find((item) => item.slot === slot);
              return entry ? [{ slot, template: entry.template }] : [];
            })
          }))
        })
      });

      if (response.ok) {
        setDailyContentStatus("saved");
        await loadAuditLogs(selectedGuildId, auditCategory);
        return;
      }

      if (response.status === 400) {
        setDailyContentValidationMessages([
          "保存できませんでした。Schedule ID、Channel ID、Timezone、Posting time、選択したslotのtemplateを確認してください。"
        ]);
        setDailyContentStatus("validation-error");
        return;
      }

      setDailyContentStatus("error");
    } catch {
      setDailyContentStatus("error");
    }
  }

  async function loadAuditLogs(guildId: string, category: AuditCategory) {
    setAuditStatus("loading");

    try {
      const response = await fetch(
        `/api/guilds/${guildId}/audit-logs?category=${category}`
      );

      if (!response.ok) {
        throw new Error("Audit request failed");
      }

      const data = (await response.json()) as { logs: AuditLogItem[] };
      setAuditLogs(data.logs);
      setAuditStatus("idle");
    } catch {
      setAuditLogs([]);
      setAuditStatus("error");
    }
  }

  useEffect(() => {
    fetch("/api/me")
      .then((response) => response.json() as Promise<MeResponse>)
      .then((data) => {
        setMe(data);
        setSelectedGuildId(data.primaryGuildId ?? data.guilds[0]?.id ?? null);
      })
      .catch(() => {
        setMe({
          authenticated: false,
          user: null,
          guilds: [],
          primaryGuildId: null
        });
      });
  }, []);

  useEffect(() => {
    if (!selectedGuildId || !me?.authenticated) {
      return;
    }

    setAutoResponseStatus("loading");

    fetch(`/api/guilds/${selectedGuildId}/autoresponse`)
      .then((response) => response.json())
      .then((data) => {
        const rules =
          Array.isArray(data.rules) && (data.rules.length > 0 || data.configured)
            ? data.rules.map((rule: Partial<AutoResponseRuleState>) =>
                createAutoResponseRule({
                  ...(rule.id ? { id: rule.id } : {}),
                  enabled: rule.enabled ?? true,
                  keyword: rule.keyword ?? "",
                  response: rule.response ?? "",
                  channelId: rule.channelId ?? "",
                  cooldownSeconds: rule.cooldownSeconds ?? 30,
                  mentionAuthor: Boolean(rule.mentionAuthor)
                })
              )
            : defaultAutoResponse.rules;

        setAutoResponse({
          enabled: Boolean(data.enabled),
          rules
        });
        setAutoResponseStatus("idle");
      })
      .catch(() => setAutoResponseStatus("error"));
  }, [me?.authenticated, selectedGuildId]);

  useEffect(() => {
    if (!selectedGuildId || !me?.authenticated) {
      setDailyContent(defaultDailyContent);
      setDailyContentStatus("idle");
      setDailyContentValidationMessages([]);
      return;
    }

    setDailyContentStatus("loading");
    setDailyContentValidationMessages([]);

    fetch(`/api/guilds/${selectedGuildId}/daily-content`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Daily Content request failed");
        }

        return response.json() as Promise<{
          enabled?: boolean;
          configured?: boolean;
          schedules?: Array<Partial<DailyContentScheduleState>>;
        }>;
      })
      .then((data) => {
        const schedules = Array.isArray(data.schedules)
          ? data.schedules.map((schedule) =>
              createDailyContentSchedule({
                id: schedule.id ?? "",
                channelId: schedule.channelId ?? "",
                timezone: schedule.timezone ?? "Asia/Tokyo",
                postingTime: schedule.postingTime ?? "09:00",
                content: Array.isArray(schedule.content)
                  ? schedule.content
                      .filter(isDailyContentTemplateState)
                      .map((entry) => ({
                        slot: entry.slot,
                        template: entry.template
                      }))
                  : []
              })
            )
          : [];

        setDailyContent({
          enabled: Boolean(data.enabled),
          schedules
        });
        setDailyContentStatus("idle");
      })
      .catch(() => {
        setDailyContent(defaultDailyContent);
        setDailyContentStatus("error");
      });
  }, [me?.authenticated, selectedGuildId]);

  useEffect(() => {
    if (!selectedGuildId || !me?.authenticated) {
      setAuditLogs([]);
      setAuditStatus("idle");
      return;
    }

    void loadAuditLogs(selectedGuildId, auditCategory);
  }, [auditCategory, me?.authenticated, selectedGuildId]);

  const selectedGuild = me?.guilds.find((guild) => guild.id === selectedGuildId);

  return (
    <main className={clsx("console-shell", theme === "light" && "theme-light")}>
      <aside className="sidebar" aria-label="Main navigation">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">
            <Moon size={20} />
          </div>
          <div>
            <p className="brand-name">Lunaria</p>
            <p className="brand-subtitle">Console</p>
          </div>
        </div>

        <nav className="nav-list">
          {navItems.map((item) => (
            <button
              className={clsx("nav-item", item.active && "is-active")}
              key={item.label}
              type="button"
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="mini-orbit" aria-hidden="true">
            <Orbit size={42} />
          </div>
          <p>Internal guild</p>
          <strong>1090997603275128904</strong>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="search-box">
            <Search size={17} />
            <span>{t.search}</span>
          </div>
          <div className="topbar-actions">
            <button
              className="icon-button language-button"
              type="button"
              aria-label="Language"
              onClick={() => setLocale(locale === "ja" ? "en" : "ja")}
            >
              <Languages size={18} />
              <span>{locale.toUpperCase()}</span>
            </button>
            <button
              className="theme-toggle"
              type="button"
              aria-label="Theme"
              aria-pressed={theme === "light"}
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              <Moon size={16} />
              <Sun size={16} />
            </button>
            {me?.authenticated ? (
              <form action="/api/auth/logout" method="post">
                <button className="guild-button" type="submit">
                  {me.user?.globalName ?? me.user?.username ?? "Logout"}
                  <ChevronDown size={16} />
                </button>
              </form>
            ) : (
              <a className="guild-button login-link" href="/api/auth/discord/login">
                Discord login
              </a>
            )}
          </div>
        </header>

        <div className="hero-panel">
          <div className="hero-copy">
            <div className="status-line">
              <span className="pulse-dot" />
              {t.status}
            </div>
            <h1>{t.title}</h1>
            <p>{t.description}</p>
            <div className="hero-actions">
              <button className="primary-button" type="button">
                <WandSparkles size={18} />
                {t.createRule}
              </button>
              <button className="secondary-button" type="button">
                <ShieldCheck size={18} />
                {t.reviewAudit}
              </button>
            </div>
          </div>

          <div className="doll-core" aria-label="Lunaria system motif">
            <div className="moon-plate">
              <div className="doll-face">
                <span />
                <span />
              </div>
              <div className="ice-ring ring-one" />
              <div className="ice-ring ring-two" />
              <Sparkles className="spark-one" size={18} />
              <Sparkles className="spark-two" size={15} />
            </div>
          </div>
        </div>

        <section className="metrics-grid" aria-label="System metrics">
          <MetricCard icon={Bot} label="Bot latency" value="42ms" detail="/lunaria ping verified" />
          <MetricCard icon={RadioTower} label="Runtime" value="Online" detail="discord.js gateway ready" />
          <MetricCard icon={Globe2} label="Locale" value={t.localeValue} detail={t.localeDetail} />
          <MetricCard icon={LockKeyhole} label="Mode" value="Internal" detail="guild-scoped configuration" />
        </section>

        <section className="guild-selector-panel" aria-label="Guild selector">
          <div>
            <h2>Guild Selector</h2>
            <p>
              {me?.authenticated
                ? "Manageable Discord guilds from OAuth2 are available below."
                : "Login with Discord to list guilds where you can manage Lunaria."}
            </p>
          </div>
          {me?.authenticated ? (
            <select
              value={selectedGuildId ?? ""}
              onChange={handleGuildChange}
            >
              {me.guilds.map((guild) => (
                <option key={guild.id} value={guild.id}>
                  {guild.name}
                </option>
              ))}
            </select>
          ) : (
            <a className="primary-button login-link" href="/api/auth/discord/login">
              <Bot size={18} />
              Connect Discord
            </a>
          )}
          {selectedGuild ? (
            <strong className="selected-guild">
              {selectedGuild.name} · {selectedGuild.id}
            </strong>
          ) : null}
        </section>

        <section className="autoresponse-panel" aria-label="AutoResponse settings">
          <div className="autoresponse-header">
            <div>
              <h2>AutoResponse</h2>
              <p>
                {locale === "ja"
                  ? "複数のキーワード反応を管理し、Lunariaが指定した返信を返します。"
                  : "Manage multiple keyword responses from Lunaria."}
              </p>
            </div>
            <div className="autoresponse-actions">
              <label className="switch-row">
                <span>{autoResponse.enabled ? "Enabled" : "Disabled"}</span>
                <input
                  checked={autoResponse.enabled}
                  type="checkbox"
                  onChange={(event) =>
                    updateAutoResponse("enabled", event.currentTarget.checked)
                  }
                />
              </label>
              <button className="secondary-button" type="button" onClick={addAutoResponseRule}>
                <Plus size={18} />
                Add rule
              </button>
            </div>
          </div>

          <div className="autoresponse-rule-list">
            {autoResponse.rules.map((rule, index) => (
              <article className="autoresponse-rule-card" key={rule.id}>
                <div className="rule-card-header">
                  <div>
                    <strong>Rule {index + 1}</strong>
                    <span>{rule.enabled ? "Live" : "Paused"}</span>
                  </div>
                  <div className="rule-card-actions">
                    <label className="switch-row">
                      <span>{rule.enabled ? "On" : "Off"}</span>
                      <input
                        checked={rule.enabled}
                        type="checkbox"
                        onChange={(event) =>
                          updateAutoResponseRule(
                            rule.id,
                            "enabled",
                            event.currentTarget.checked
                          )
                        }
                      />
                    </label>
                    <button
                      aria-label="Delete AutoResponse rule"
                      className="danger-icon-button"
                      type="button"
                      onClick={() => removeAutoResponseRule(rule.id)}
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>

                <div className="autoresponse-form">
                  <label>
                    <span>Keyword</span>
                    <input
                      value={rule.keyword}
                      maxLength={80}
                      onChange={(event) =>
                        updateAutoResponseRule(
                          rule.id,
                          "keyword",
                          event.currentTarget.value
                        )
                      }
                    />
                  </label>
                  <label>
                    <span>Channel ID</span>
                    <input
                      value={rule.channelId}
                      placeholder="空なら全チャンネル"
                      onChange={(event) =>
                        updateAutoResponseRule(
                          rule.id,
                          "channelId",
                          event.currentTarget.value
                        )
                      }
                    />
                  </label>
                  <label>
                    <span>Cooldown seconds</span>
                    <input
                      min={0}
                      max={86400}
                      type="number"
                      value={rule.cooldownSeconds}
                      onChange={(event) =>
                        updateAutoResponseRule(
                          rule.id,
                          "cooldownSeconds",
                          Number(event.currentTarget.value)
                        )
                      }
                    />
                  </label>
                  <label className="response-field">
                    <span>Response</span>
                    <textarea
                      value={rule.response}
                      maxLength={1800}
                      rows={3}
                      onChange={(event) =>
                        updateAutoResponseRule(
                          rule.id,
                          "response",
                          event.currentTarget.value
                        )
                      }
                    />
                  </label>
                  <label className="check-row">
                    <input
                      checked={rule.mentionAuthor}
                      type="checkbox"
                      onChange={(event) =>
                        updateAutoResponseRule(
                          rule.id,
                          "mentionAuthor",
                          event.currentTarget.checked
                        )
                      }
                    />
                    <span>返信時に投稿者へメンションする</span>
                  </label>
                </div>
              </article>
            ))}
          </div>

          <div className="autoresponse-preview">
            <div>
              <MessageSquareReply size={18} />
              <span>{autoResponse.rules.length} rules</span>
              <strong>
                {autoResponse.rules.filter((rule) => rule.enabled).length} active
              </strong>
            </div>
            <button
              className="primary-button"
              type="button"
              disabled={!me?.authenticated || autoResponseStatus === "saving"}
              onClick={saveAutoResponse}
            >
              <Save size={18} />
              {autoResponseStatus === "saving" ? "Saving" : "Save AutoResponse"}
            </button>
          </div>
          {autoResponseStatus === "saved" ? (
            <p className="form-message success">AutoResponse設定を保存しました。</p>
          ) : null}
          {autoResponseStatus === "unchanged" ? (
            <p className="form-message success">変更はありません。監査ログは追加されませんでした。</p>
          ) : null}
          {autoResponseStatus === "error" ? (
            <p className="form-message error">
              AutoResponse設定の読み込みまたは保存に失敗しました。
            </p>
          ) : null}
        </section>

        <section
          className="daily-content-panel"
          id="daily-content-settings"
          aria-label="Daily Content settings"
        >
          <div className="daily-content-header">
            <div>
              <h2>Daily Content</h2>
              <p>
                {locale === "ja"
                  ? "ギルドごとの日次投稿スケジュール、投稿先、slot別テンプレートを管理します。"
                  : "Manage guild-scoped daily schedules, channels, and slot templates."}
              </p>
            </div>
            <div className="daily-content-actions">
              <label className="switch-row">
                <span>{dailyContent.enabled ? "Enabled" : "Disabled"}</span>
                <input
                  checked={dailyContent.enabled}
                  type="checkbox"
                  disabled={!me?.authenticated || dailyContentStatus === "loading"}
                  onChange={(event) =>
                    updateDailyContent("enabled", event.currentTarget.checked)
                  }
                />
              </label>
              <button
                className="secondary-button"
                type="button"
                disabled={!me?.authenticated || dailyContentStatus === "loading"}
                onClick={addDailyContentSchedule}
              >
                <Plus size={18} />
                Add schedule
              </button>
            </div>
          </div>

          <datalist id="daily-content-timezones">
            {timezoneOptions.map((timezone) => (
              <option key={timezone} value={timezone} />
            ))}
          </datalist>

          {!me?.authenticated ? (
            <div className="daily-content-empty">
              <CalendarClock size={20} />
              <strong>Discord login required</strong>
              <p>Discordに接続すると、管理可能なguildのDaily Content設定を編集できます。</p>
            </div>
          ) : dailyContentStatus === "loading" ? (
            <div className="daily-content-empty">
              <RefreshCw size={20} />
              <strong>Loading settings</strong>
              <p>選択中のguildからDaily Content設定を読み込んでいます。</p>
            </div>
          ) : dailyContent.schedules.length === 0 ? (
            <div className="daily-content-empty">
              <CalendarClock size={20} />
              <strong>No schedules yet</strong>
              <p>enabledを無効にしたままでも、scheduleを追加して保存できます。</p>
              <button
                className="secondary-button"
                type="button"
                onClick={addDailyContentSchedule}
              >
                <Plus size={18} />
                Add first schedule
              </button>
            </div>
          ) : (
            <div className="daily-content-schedule-list">
              {dailyContent.schedules.map((schedule, index) => (
                <article className="daily-content-schedule-card" key={schedule.clientKey}>
                  <div className="rule-card-header">
                    <div>
                      <strong>Schedule {index + 1}</strong>
                      <span>
                        {schedule.postingTime || "未設定"} / {schedule.timezone || "Timezone未設定"}
                      </span>
                    </div>
                    <button
                      aria-label="Delete Daily Content schedule"
                      className="danger-icon-button"
                      type="button"
                      onClick={() => removeDailyContentSchedule(schedule.clientKey)}
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>

                  <div className="daily-content-form">
                    <label>
                      <span>Schedule ID</span>
                      <input
                        value={schedule.id}
                        maxLength={120}
                        placeholder="daily-morning"
                        onChange={(event) =>
                          updateDailyContentSchedule(
                            schedule.clientKey,
                            "id",
                            event.currentTarget.value
                          )
                        }
                      />
                    </label>
                    <label>
                      <span>Channel ID</span>
                      <input
                        value={schedule.channelId}
                        maxLength={32}
                        placeholder="123456789012345678"
                        onChange={(event) =>
                          updateDailyContentSchedule(
                            schedule.clientKey,
                            "channelId",
                            event.currentTarget.value
                          )
                        }
                      />
                    </label>
                    <label>
                      <span>Timezone</span>
                      <input
                        value={schedule.timezone}
                        list="daily-content-timezones"
                        placeholder="Asia/Tokyo"
                        onChange={(event) =>
                          updateDailyContentSchedule(
                            schedule.clientKey,
                            "timezone",
                            event.currentTarget.value
                          )
                        }
                      />
                    </label>
                    <label>
                      <span>Posting time</span>
                      <input
                        value={schedule.postingTime}
                        type="time"
                        onChange={(event) =>
                          updateDailyContentSchedule(
                            schedule.clientKey,
                            "postingTime",
                            event.currentTarget.value
                          )
                        }
                      />
                    </label>
                  </div>

                  <div className="daily-content-slot-list">
                    {dailyContentSlots.map(({ slot, label, placeholder }) => {
                      const entry = schedule.content.find((item) => item.slot === slot);

                      return (
                        <div className="daily-content-slot-row" key={slot}>
                          <label className="check-row">
                            <input
                              checked={Boolean(entry)}
                              type="checkbox"
                              onChange={(event) =>
                                setDailyContentSlotIncluded(
                                  schedule.clientKey,
                                  slot,
                                  event.currentTarget.checked
                                )
                              }
                            />
                            <span>{label}</span>
                          </label>
                          <textarea
                            value={entry?.template ?? ""}
                            rows={3}
                            maxLength={1800}
                            disabled={!entry}
                            placeholder={placeholder}
                            onChange={(event) =>
                              updateDailyContentTemplate(
                                schedule.clientKey,
                                slot,
                                event.currentTarget.value
                              )
                            }
                          />
                        </div>
                      );
                    })}
                  </div>
                </article>
              ))}
            </div>
          )}

          <div className="daily-content-preview">
            <div>
              <CalendarClock size={18} />
              <span>{dailyContent.schedules.length} schedules</span>
              <strong>
                {dailyContent.schedules.reduce(
                  (total, schedule) => total + schedule.content.length,
                  0
                )} slots
              </strong>
            </div>
            <button
              className="primary-button"
              type="button"
              disabled={
                !me?.authenticated ||
                dailyContentStatus === "saving" ||
                dailyContentStatus === "loading"
              }
              onClick={saveDailyContent}
            >
              <Save size={18} />
              {dailyContentStatus === "saving" ? "Saving" : "Save Daily Content"}
            </button>
          </div>

          {dailyContentStatus === "saved" ? (
            <p className="form-message success">
              <CheckCircle2 size={16} />
              Daily Content設定を保存しました。
            </p>
          ) : null}
          {dailyContentStatus === "validation-error" ? (
            <div className="form-message error">
              <AlertTriangle size={16} />
              <div>
                <strong>入力内容を確認してください。</strong>
                <ul>
                  {dailyContentValidationMessages.map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}
          {dailyContentStatus === "error" ? (
            <p className="form-message error">
              <AlertTriangle size={16} />
              Daily Content設定の読み込みまたは保存に失敗しました。
            </p>
          ) : null}
        </section>

        <section className="content-grid">
          <div className="panel plugin-panel">
            <div className="panel-header">
              <div>
                <h2>Plugin Registry</h2>
                <p>Guild-scoped modules ready for rule workflows.</p>
              </div>
              <button className="panel-command" type="button">Manage</button>
            </div>
            <div className="plugin-list">
              {pluginCards.map((plugin) => (
                <div className="plugin-row" key={plugin.name}>
                  <span className={clsx("plugin-orb", plugin.tone)} />
                  <div>
                    <strong>{plugin.name}</strong>
                    <p>{plugin.detail}</p>
                  </div>
                  {"href" in plugin ? (
                    <a className="status-chip" href={plugin.href}>
                      {plugin.status}
                    </a>
                  ) : (
                    <span className="status-chip">{plugin.status}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="panel rule-panel">
            <div className="panel-header">
              <div>
                <h2>Rule Engine</h2>
                <p>Trigger, condition, action workflows.</p>
              </div>
            </div>
            <div className="rule-table">
              {rules.map((rule) => (
                <div className="rule-row" key={`${rule.trigger}-${rule.action}`}>
                  <span>{rule.trigger}</span>
                  <span>{rule.condition}</span>
                  <span>{rule.action}</span>
                  <strong>{rule.state}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="panel audit-panel">
            <div className="panel-header">
              <div>
                <h2>Audit Stream</h2>
                <p>
                  {locale === "ja"
                    ? "直近25件の設定変更とルール発火ログ。"
                    : "Latest 25 configuration and rule activity events."}
                </p>
              </div>
              <div className="audit-controls">
                <select
                  aria-label={locale === "ja" ? "監査ログの種類" : "Audit event category"}
                  className="audit-filter"
                  value={auditCategory}
                  onChange={(event) =>
                    setAuditCategory(event.currentTarget.value as AuditCategory)
                  }
                >
                  <option value="all">{locale === "ja" ? "すべて" : "All events"}</option>
                  <option value="configuration">
                    {locale === "ja" ? "設定変更" : "Configuration"}
                  </option>
                  <option value="activity">{locale === "ja" ? "返信実行" : "Replies"}</option>
                </select>
                <button
                  aria-label={locale === "ja" ? "監査ログを更新" : "Refresh audit logs"}
                  className="audit-refresh"
                  type="button"
                  disabled={!selectedGuildId || !me?.authenticated || auditStatus === "loading"}
                  onClick={() =>
                    selectedGuildId && void loadAuditLogs(selectedGuildId, auditCategory)
                  }
                >
                  <RefreshCw size={17} />
                </button>
              </div>
            </div>
            {!me?.authenticated ? (
              <p className="audit-empty">
                {locale === "ja"
                  ? "Discordに接続すると監査ログを表示できます。"
                  : "Connect Discord to view audit logs."}
              </p>
            ) : auditStatus === "loading" ? (
              <p className="audit-empty">
                {locale === "ja" ? "監査ログを読み込んでいます。" : "Loading audit logs."}
              </p>
            ) : auditStatus === "error" ? (
              <p className="audit-empty is-error">
                {locale === "ja"
                  ? "監査ログを取得できませんでした。"
                  : "Audit logs could not be loaded."}
              </p>
            ) : auditLogs.length === 0 ? (
              <p className="audit-empty">
                {locale === "ja" ? "まだ監査ログはありません。" : "There are no audit logs yet."}
              </p>
            ) : (
              <ol className="audit-list">
                {auditLogs.map((item) => {
                  const summary = formatAuditSummary(item, locale);

                  return (
                    <li className="audit-entry" key={item.id}>
                      <div>
                        <strong>{formatAuditEvent(item.type, locale)}</strong>
                        <time dateTime={item.createdAt}>
                          {formatAuditTime(item.createdAt, locale)}
                        </time>
                      </div>
                      {summary ? <span className="audit-diff">{summary}</span> : null}
                      <p>{item.pluginId} / {item.actorUserId}</p>
                      {item.targetId ? <span>target: {item.targetId}</span> : null}
                    </li>
                  );
                })}
              </ol>
            )}
          </div>

          <div className="panel billing-panel">
            <div className="panel-header">
              <div>
                <h2>Future Entitlements</h2>
                <p>Plan-aware quotas are designed in from day one.</p>
              </div>
              <CircleDollarSign size={19} />
            </div>
            <div className="entitlement-scale">
              <span />
              <span />
              <span />
            </div>
            <p className="panel-note">
              Guild and user based billing boundaries will attach to plugin
              capabilities, AI quota, custom bot instances, and storage.
            </p>
          </div>

          <div className="panel schedule-panel">
            <div className="panel-header">
              <div>
                <h2>Daily Content</h2>
                <p>Next scheduled community spark.</p>
              </div>
              <CalendarClock size={19} />
            </div>
            <div className="schedule-card">
              <strong>09:00 JST</strong>
              <span>今日の質問 + quote rotation</span>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

function formatAuditEvent(type: string, locale: "ja" | "en"): string {
  const labels = {
    "autoresponse.config.updated": {
      ja: "AutoResponse設定を更新",
      en: "AutoResponse settings updated"
    },
    "autoresponse.rule.matched": {
      ja: "AutoResponseが返信",
      en: "AutoResponse replied"
    },
    "daily_content.config.updated": {
      ja: "Daily Content設定を更新",
      en: "Daily Content settings updated"
    }
  } as const;

  const event = labels[type as keyof typeof labels];
  return event?.[locale] ?? type;
}

function formatAuditTime(dateTime: string, locale: "ja" | "en"): string {
  return new Intl.DateTimeFormat(locale === "ja" ? "ja-JP" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(dateTime));
}

function formatAuditSummary(item: AuditLogItem, locale: "ja" | "en"): string | undefined {
  if (item.type === "autoresponse.rule.matched" && item.data?.keyword) {
    return locale === "ja"
      ? `キーワード: ${item.data.keyword}`
      : `Keyword: ${item.data.keyword}`;
  }

  if (item.type !== "autoresponse.config.updated") {
    if (item.type === "daily_content.config.updated") {
      const scheduleCount = item.data?.scheduleCount ?? 0;
      return locale === "ja"
        ? `Schedule ${scheduleCount}件`
        : `${scheduleCount} schedules`;
    }

    return undefined;
  }

  const fragments: string[] = [];
  const enabledChange = item.data?.enabledChange;

  if (enabledChange) {
    const before = enabledChange.before === null
      ? locale === "ja" ? "未設定" : "Not configured"
      : formatEnabled(enabledChange.before, locale);
    fragments.push(
      locale === "ja"
        ? `状態: ${before} -> ${formatEnabled(enabledChange.after, locale)}`
        : `Status: ${before} -> ${formatEnabled(enabledChange.after, locale)}`
    );
  }

  const ruleChanges = item.data?.ruleChanges ?? [];
  const counts = {
    added: ruleChanges.filter((change) => change.kind === "added").length,
    updated: ruleChanges.filter((change) => change.kind === "updated").length,
    removed: ruleChanges.filter((change) => change.kind === "removed").length
  };

  if (counts.added > 0) {
    fragments.push(locale === "ja" ? `追加 ${counts.added}` : `${counts.added} added`);
  }
  if (counts.updated > 0) {
    fragments.push(locale === "ja" ? `変更 ${counts.updated}` : `${counts.updated} edited`);
  }
  if (counts.removed > 0) {
    fragments.push(locale === "ja" ? `削除 ${counts.removed}` : `${counts.removed} removed`);
  }

  return fragments.length > 0 ? fragments.join(" / ") : undefined;
}

function isDailyContentTemplateState(value: unknown): value is DailyContentTemplateState {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Partial<DailyContentTemplateState>;
  return (
    (candidate.slot === "quote" ||
      candidate.slot === "question" ||
      candidate.slot === "mission") &&
    typeof candidate.template === "string"
  );
}

function validateDailyContent(state: DailyContentState): string[] {
  const messages: string[] = [];
  const ids = new Set<string>();

  if (state.schedules.length > 20) {
    messages.push("scheduleは20件以内にしてください。");
  }

  state.schedules.forEach((schedule, index) => {
    const label = `Schedule ${index + 1}`;
    const id = schedule.id.trim();
    const channelId = schedule.channelId.trim();
    const timezone = schedule.timezone.trim();
    const postingTime = schedule.postingTime.trim();

    if (!id || id.length > 120 || !/^[A-Za-z0-9_-]+$/.test(id)) {
      messages.push(`${label}: idは1〜120文字の英数字、ハイフン、アンダースコアで入力してください。`);
    } else if (ids.has(id)) {
      messages.push(`${label}: idが重複しています。`);
    } else {
      ids.add(id);
    }

    if (!channelId || channelId.length > 32) {
      messages.push(`${label}: channelIdは1〜32文字で入力してください。`);
    }

    if (!timezone || !isValidTimezone(timezone)) {
      messages.push(`${label}: timezoneはIANA timezoneで入力してください。`);
    }

    if (!/^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/.test(postingTime)) {
      messages.push(`${label}: postingTimeはHH:mm形式で入力してください。`);
    }

    if (schedule.content.length < 1 || schedule.content.length > 3) {
      messages.push(`${label}: quote / question / mission のうち1つ以上を選択してください。`);
    }

    dailyContentSlots.forEach(({ slot, label: slotLabel }) => {
      const entry = schedule.content.find((item) => item.slot === slot);

      if (entry && (entry.template.trim().length === 0 || entry.template.length > 1800)) {
        messages.push(`${label}: ${slotLabel} templateは1〜1800文字で入力してください。`);
      }
    });
  });

  return messages;
}

function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format();
    return true;
  } catch {
    return false;
  }
}

function formatEnabled(enabled: boolean, locale: "ja" | "en"): string {
  if (locale === "ja") {
    return enabled ? "有効" : "無効";
  }

  return enabled ? "Enabled" : "Disabled";
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="metric-card">
      <Icon size={19} />
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </div>
  );
}
