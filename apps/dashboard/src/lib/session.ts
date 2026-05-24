import { createHmac, timingSafeEqual } from "node:crypto";

export type DiscordGuild = {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
  manageable: boolean;
};

export type DashboardSession = {
  user: {
    id: string;
    username: string;
    globalName: string | null;
    avatar: string | null;
  };
  guilds: DiscordGuild[];
  createdAt: number;
};

const encoder = new TextEncoder();

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function encodeSession(session: DashboardSession, secret: string): string {
  const payload = base64UrlEncode(JSON.stringify(session));
  return `${payload}.${sign(payload, secret)}`;
}

export function decodeSession(
  cookieValue: string | undefined,
  secret: string
): DashboardSession | null {
  if (!cookieValue) {
    return null;
  }

  const [payload, signature] = cookieValue.split(".");
  if (!payload || !signature) {
    return null;
  }

  const expected = sign(payload, secret);
  const signatureBytes = encoder.encode(signature);
  const expectedBytes = encoder.encode(expected);

  if (
    signatureBytes.byteLength !== expectedBytes.byteLength ||
    !timingSafeEqual(signatureBytes, expectedBytes)
  ) {
    return null;
  }

  try {
    return JSON.parse(base64UrlDecode(payload)) as DashboardSession;
  } catch {
    return null;
  }
}

export function canManageGuild(permissions: string, owner: boolean): boolean {
  if (owner) {
    return true;
  }

  const permissionBits = BigInt(permissions);
  const administrator = 0x0000000000000008n;
  const manageGuild = 0x0000000000000020n;

  return Boolean(permissionBits & administrator || permissionBits & manageGuild);
}

