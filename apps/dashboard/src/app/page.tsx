"use client";

import { useState } from "react";
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
  Moon,
  Orbit,
  Plug,
  RadioTower,
  Search,
  ShieldCheck,
  Sparkles,
  Sun,
  TerminalSquare,
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

const auditItems = [
  "Quote plugin enabled for ivRooom",
  "Guild command /lunaria ping verified",
  "Redis cache connected on 16379",
  "PostgreSQL healthy on 15432"
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

export default function DashboardPage() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [locale, setLocale] = useState<"ja" | "en">("ja");
  const t = copy[locale];

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
            <button className="guild-button" type="button">
              ivRooom
              <ChevronDown size={16} />
            </button>
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
                <p>Recent safe-change ledger.</p>
              </div>
              <FileClock size={19} />
            </div>
            <ol className="audit-list">
              {auditItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
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
