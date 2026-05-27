import { Ajv, type ErrorObject, type ValidateFunction } from "ajv";
import type { AuditEventDefinition } from "./audit.js";

export type JsonObject = Record<string, unknown>;

export interface PluginPricingPolicy {
  readonly planKeys: readonly string[];
  readonly usageLimitKey?: string;
}

export interface PluginDependency {
  readonly pluginId: string;
  readonly optional?: boolean;
}

export interface PluginPermissionDefinition {
  readonly permission: string;
  readonly label: string;
  readonly description: string;
}

export interface PluginMetadata {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly configSchema: JsonObject;
  readonly permissions: readonly PluginPermissionDefinition[];
  readonly auditEvents: readonly AuditEventDefinition[];
  readonly pricing: PluginPricingPolicy;
  readonly dependencies: readonly PluginDependency[];
}

export interface ConfigValidationResult {
  readonly valid: boolean;
  readonly errors: readonly ErrorObject[];
}

export interface GuildPluginSettings {
  readonly guildId: string;
  readonly pluginId: string;
  readonly enabled: boolean;
  readonly config: JsonObject;
  readonly updatedByUserId: string;
  readonly updatedAt: Date;
}

export interface GuildPluginSettingsStore {
  get(guildId: string, pluginId: string): Promise<GuildPluginSettings | undefined>;
  set(settings: GuildPluginSettings): Promise<GuildPluginSettings>;
  listByGuild(guildId: string): Promise<GuildPluginSettings[]>;
}

export class PluginRegistry {
  private readonly plugins = new Map<string, PluginMetadata>();
  private readonly validators = new Map<string, ValidateFunction>();

  constructor(private readonly ajv = new Ajv({ allErrors: true, strict: false })) {
    this.ajv.addFormat("iana-time-zone", {
      type: "string",
      validate: (value: string) => {
        try {
          new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
          return true;
        } catch {
          return false;
        }
      }
    });
  }

  register(plugin: PluginMetadata): void {
    if (this.plugins.has(plugin.id)) {
      throw new Error(`Plugin already registered: ${plugin.id}`);
    }

    const validator = this.ajv.compile(plugin.configSchema);
    this.plugins.set(plugin.id, plugin);
    this.validators.set(plugin.id, validator);
  }

  get(pluginId: string): PluginMetadata | undefined {
    return this.plugins.get(pluginId);
  }

  list(): PluginMetadata[] {
    return [...this.plugins.values()];
  }

  validateConfig(pluginId: string, config: JsonObject): ConfigValidationResult {
    const validator = this.validators.get(pluginId);

    if (!validator) {
      throw new Error(`Unknown plugin: ${pluginId}`);
    }

    const valid = validator(config);
    return {
      valid,
      errors: validator.errors ?? []
    };
  }
}

export class InMemoryGuildPluginSettingsStore implements GuildPluginSettingsStore {
  private readonly settings = new Map<string, GuildPluginSettings>();

  async get(guildId: string, pluginId: string): Promise<GuildPluginSettings | undefined> {
    return this.settings.get(this.key(guildId, pluginId));
  }

  async set(settings: GuildPluginSettings): Promise<GuildPluginSettings> {
    this.settings.set(this.key(settings.guildId, settings.pluginId), settings);
    return settings;
  }

  async listByGuild(guildId: string): Promise<GuildPluginSettings[]> {
    return [...this.settings.values()].filter((settings) => settings.guildId === guildId);
  }

  private key(guildId: string, pluginId: string): string {
    return `${guildId}:${pluginId}`;
  }
}

export class GuildPluginService {
  constructor(
    private readonly registry: PluginRegistry,
    private readonly store: GuildPluginSettingsStore
  ) {}

  async setEnabled(input: {
    guildId: string;
    pluginId: string;
    enabled: boolean;
    config: JsonObject;
    actorUserId: string;
  }): Promise<GuildPluginSettings> {
    if (!this.registry.get(input.pluginId)) {
      throw new Error(`Unknown plugin: ${input.pluginId}`);
    }

    const validation = this.registry.validateConfig(input.pluginId, input.config);

    if (!validation.valid) {
      throw new Error(`Invalid config for plugin: ${input.pluginId}`);
    }

    return this.store.set({
      guildId: input.guildId,
      pluginId: input.pluginId,
      enabled: input.enabled,
      config: input.config,
      updatedByUserId: input.actorUserId,
      updatedAt: new Date()
    });
  }
}
