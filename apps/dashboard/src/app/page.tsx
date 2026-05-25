"use client";

import { type ChangeEvent, useEffect, useState } from "react";
import {
  Activity,
  Bot,
  CalendarClock,
  ChevronDown,
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
  { name: "Daily Content", status: "Draft", detail: "Next post 09:00", tone: "blue" },
  { name: "LFG", status: "Enabled", detail: "3 open parties", tone: "mint" }
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
                  <span className="status-chip">{plugin.status}</span>
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
