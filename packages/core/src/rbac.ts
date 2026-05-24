export type SystemRoleKey =
  | "owner"
  | "admin"
  | "moderator"
  | "event_manager"
  | "viewer";

export interface RoleDefinition {
  readonly key: SystemRoleKey;
  readonly label: string;
  readonly description: string;
  readonly permissions: readonly string[];
}

export interface RbacActor {
  readonly guildId: string;
  readonly userId: string;
  readonly roleKeys: readonly SystemRoleKey[];
}

export const DEFAULT_ROLES: readonly RoleDefinition[] = [
  {
    key: "owner",
    label: "Owner",
    description: "Full administrative access to Lunaria for the guild.",
    permissions: ["*"]
  },
  {
    key: "admin",
    label: "Admin",
    description: "Can manage plugins, settings, roles, templates, and audit views.",
    permissions: [
      "plugins:*",
      "settings:*",
      "rbac:*",
      "audit:read",
      "events:*",
      "lfg:*",
      "quotes:*",
      "rules:*"
    ]
  },
  {
    key: "moderator",
    label: "Moderator",
    description: "Can operate moderation, rules, quotes, and audit review workflows.",
    permissions: ["moderation:*", "rules:*", "quotes:*", "audit:read"]
  },
  {
    key: "event_manager",
    label: "Event Manager",
    description: "Can manage LFG, events, teams, daily content, and reminders.",
    permissions: ["events:*", "lfg:*", "teams:*", "daily:*", "reminders:*"]
  },
  {
    key: "viewer",
    label: "Viewer",
    description: "Can view dashboard state and analytics without changing settings.",
    permissions: ["dashboard:read", "analytics:read"]
  }
];

export function hasPermission(
  actor: RbacActor,
  permission: string,
  roles: readonly RoleDefinition[] = DEFAULT_ROLES
): boolean {
  const granted = actor.roleKeys.flatMap((roleKey) => {
    const role = roles.find((candidate) => candidate.key === roleKey);
    return role?.permissions ?? [];
  });

  return granted.some((candidate) => {
    if (candidate === "*") {
      return true;
    }

    if (candidate.endsWith(":*")) {
      return permission.startsWith(candidate.slice(0, -1));
    }

    return candidate === permission;
  });
}
