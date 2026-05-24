import { canManageGuild, type DiscordGuild } from "./session";

const DISCORD_API_BASE = "https://discord.com/api/v10";

type DiscordTokenResponse = {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
};

type DiscordUserResponse = {
  id: string;
  username: string;
  global_name: string | null;
  avatar: string | null;
};

type DiscordGuildResponse = {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
};

export function buildDiscordAuthorizeUrl({
  clientId,
  callbackUrl,
  state
}: {
  clientId: string;
  callbackUrl: string;
  state: string;
}): string {
  const url = new URL("https://discord.com/oauth2/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", callbackUrl);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "identify guilds");
  url.searchParams.set("state", state);
  return url.toString();
}

export async function exchangeDiscordCode({
  code,
  clientId,
  clientSecret,
  callbackUrl
}: {
  code: string;
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
}): Promise<DiscordTokenResponse> {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: callbackUrl
  });

  const response = await fetch(`${DISCORD_API_BASE}/oauth2/token`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded"
    },
    body
  });

  if (!response.ok) {
    throw new Error(`Discord token exchange failed: ${response.status}`);
  }

  return response.json() as Promise<DiscordTokenResponse>;
}

export async function fetchDiscordUser(
  accessToken: string
): Promise<DiscordUserResponse> {
  const response = await fetch(`${DISCORD_API_BASE}/users/@me`, {
    headers: {
      authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error(`Discord user fetch failed: ${response.status}`);
  }

  return response.json() as Promise<DiscordUserResponse>;
}

export async function fetchDiscordGuilds(
  accessToken: string
): Promise<DiscordGuild[]> {
  const response = await fetch(`${DISCORD_API_BASE}/users/@me/guilds`, {
    headers: {
      authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error(`Discord guild fetch failed: ${response.status}`);
  }

  const guilds = (await response.json()) as DiscordGuildResponse[];
  return guilds.map((guild) => ({
    ...guild,
    manageable: canManageGuild(guild.permissions, guild.owner)
  }));
}

