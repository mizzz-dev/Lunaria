import sharp from "sharp";

export type QuoteCardTheme = "color" | "black" | "white";
export type QuoteCardAvatarPosition = "left" | "right";

export interface QuoteCardAppearance {
  readonly theme: QuoteCardTheme;
  readonly avatarPosition: QuoteCardAvatarPosition;
}

export interface QuoteCardContent {
  readonly content: string;
  readonly sourceAuthorName: string;
  readonly sourceChannelName: string;
  readonly sourceCreatedAt: Date;
}

interface QuoteCardPalette {
  readonly background: string;
  readonly surface: string;
  readonly foreground: string;
  readonly muted: string;
  readonly accent: string;
  readonly border: string;
}

const width = 1200;
const height = 630;
const portraitWidth = 520;

export async function renderQuoteCard(input: {
  readonly quote: QuoteCardContent;
  readonly avatarUrl?: string;
  readonly appearance: QuoteCardAppearance;
  readonly fetchImage?: (url: string) => Promise<Buffer | undefined>;
}): Promise<Buffer> {
  const colors = palette(input.appearance.theme);
  const avatar = await loadAvatar(input.avatarUrl, input.fetchImage);
  const portrait = await buildPortrait(avatar, input.appearance.theme, colors.surface);
  const portraitLeft = input.appearance.avatarPosition === "left" ? 0 : width - portraitWidth;
  const overlay = buildOverlaySvg(input.quote, input.appearance, colors);

  return sharp({
    create: {
      width,
      height,
      channels: 4,
      background: colors.background
    }
  })
    .composite([
      { input: portrait, left: portraitLeft, top: 0 },
      { input: Buffer.from(overlay), left: 0, top: 0 }
    ])
    .png()
    .toBuffer();
}

function palette(theme: QuoteCardTheme): QuoteCardPalette {
  if (theme === "white") {
    return {
      background: "#f7f3ea",
      surface: "#e3ded3",
      foreground: "#171614",
      muted: "#70685d",
      accent: "#ae8141",
      border: "#d8d0c2"
    };
  }

  if (theme === "color") {
    return {
      background: "#0b1119",
      surface: "#182632",
      foreground: "#faf5eb",
      muted: "#a8b4b8",
      accent: "#d7a052",
      border: "#293640"
    };
  }

  return {
    background: "#080808",
    surface: "#181818",
    foreground: "#f6f3eb",
    muted: "#a6a198",
    accent: "#cfba91",
    border: "#292825"
  };
}

async function loadAvatar(
  avatarUrl: string | undefined,
  fetchImage?: (url: string) => Promise<Buffer | undefined>
): Promise<Buffer | undefined> {
  if (!avatarUrl) {
    return undefined;
  }

  if (fetchImage) {
    return fetchImage(avatarUrl);
  }

  try {
    const url = new URL(avatarUrl);
    if (!["cdn.discordapp.com", "media.discordapp.net"].includes(url.hostname)) {
      return undefined;
    }

    const response = await fetch(url);
    if (!response.ok) {
      return undefined;
    }

    return Buffer.from(await response.arrayBuffer());
  } catch {
    return undefined;
  }
}

async function buildPortrait(
  avatar: Buffer | undefined,
  theme: QuoteCardTheme,
  fallbackColor: string
): Promise<Buffer> {
  if (!avatar) {
    return sharp({
      create: {
        width: portraitWidth,
        height,
        channels: 4,
        background: fallbackColor
      }
    })
      .png()
      .toBuffer();
  }

  const image = sharp(avatar)
    .resize(portraitWidth, height, { fit: "cover", position: "centre" })
    .sharpen({ sigma: 0.65 });
  return (theme === "color" ? image.modulate({ saturation: 1.08 }) : image.grayscale())
    .png()
    .toBuffer();
}

function buildOverlaySvg(
  quote: QuoteCardContent,
  appearance: QuoteCardAppearance,
  colors: QuoteCardPalette
): string {
  const isPortraitLeft = appearance.avatarPosition === "left";
  const textX = isPortraitLeft ? 594 : 64;
  const textWidth = 540;
  const normalizedText = quote.content.trim().replace(/\s+/g, " ");
  const fontSize = normalizedText.length > 108 ? 33 : normalizedText.length > 52 ? 41 : 49;
  const lineWidth = Math.max(Math.floor(textWidth / (fontSize * 0.93)), 10);
  const lines = wrap(truncate(normalizedText, lineWidth * 5), lineWidth).slice(0, 5);
  const lineHeight = fontSize * 1.55;
  const startY = 230 - ((lines.length - 1) * lineHeight) / 2;
  const quoteLines = lines
    .map(
      (line, index) =>
        `<text x="${textX}" y="${startY + index * lineHeight}" class="quote">${escapeXml(line)}</text>`
    )
    .join("");
  const attribution = quote.sourceAuthorName;
  const meta = `#${quote.sourceChannelName}  /  ${new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(quote.sourceCreatedAt)}`;
  const fadeX = isPortraitLeft ? 226 : 650;
  const fadeTransform = isPortraitLeft ? "" : ' gradientTransform="rotate(180 0.5 0.5)"';
  const glowX = isPortraitLeft ? "86%" : "14%";

  return `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="portraitFade" x1="0" x2="1"${fadeTransform}>
      <stop offset="0" stop-color="${colors.background}" stop-opacity="0"/>
      <stop offset="1" stop-color="${colors.background}" stop-opacity="1"/>
    </linearGradient>
    <radialGradient id="glow" cx="${glowX}" cy="15%" r="54%">
      <stop stop-color="${colors.accent}" stop-opacity="0.16"/>
      <stop offset="1" stop-color="${colors.accent}" stop-opacity="0"/>
    </radialGradient>
    <pattern id="grain" width="18" height="18" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="4" r="0.7" fill="${colors.foreground}" opacity="0.045"/>
      <circle cx="13" cy="10" r="0.6" fill="${colors.foreground}" opacity="0.035"/>
      <circle cx="7" cy="16" r="0.5" fill="${colors.foreground}" opacity="0.04"/>
    </pattern>
    <style>
      .quote { font: 500 ${fontSize}px "Yu Mincho", "Hiragino Mincho ProN", "Noto Serif JP", serif; fill: ${colors.foreground}; letter-spacing: 0.045em; }
      .author { font: 600 25px "Yu Gothic UI", "Noto Sans JP", sans-serif; fill: ${colors.foreground}; letter-spacing: 0.04em; }
      .meta { font: 400 17px "Segoe UI", "Noto Sans JP", sans-serif; fill: ${colors.muted}; letter-spacing: 0.14em; }
      .brand { font: 600 18px "Georgia", serif; fill: ${colors.muted}; letter-spacing: 0.32em; }
      .serial { font: 500 13px "Segoe UI", sans-serif; fill: ${colors.muted}; letter-spacing: 0.28em; }
    </style>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#glow)"/>
  <rect x="${fadeX}" width="324" height="${height}" fill="url(#portraitFade)"/>
  <rect width="${width}" height="${height}" fill="url(#grain)"/>
  <rect x="28" y="28" width="1144" height="574" rx="3" fill="none" stroke="${colors.border}" stroke-width="1"/>
  <text x="${textX}" y="82" class="serial">LUNARIA / QUOTE ARCHIVE</text>
  <line x1="${textX}" y1="107" x2="${textX + textWidth}" y2="107" stroke="${colors.border}"/>
  <text x="${textX}" y="164" fill="${colors.accent}" font-size="70" font-family="Georgia, serif">“</text>
  ${quoteLines}
  <line x1="${textX}" y1="452" x2="${textX + 52}" y2="452" stroke="${colors.accent}" stroke-width="2"/>
  <text x="${textX + 70}" y="461" class="author">${escapeXml(attribution)}</text>
  <text x="${textX + 70}" y="493" class="meta">${escapeXml(meta)}</text>
  <text x="${textX}" y="558" class="brand">LUNARIA</text>
  <text x="${textX + 455}" y="558" class="serial">EST. 2026</text>
</svg>`;
}

function wrap(text: string, maxChars: number): string[] {
  const lines: string[] = [];
  let remaining = text;

  while (remaining.length > maxChars) {
    const segment = remaining.slice(0, maxChars + 1);
    const breakAt = Math.max(
      segment.lastIndexOf(" "),
      segment.lastIndexOf("、"),
      segment.lastIndexOf("。")
    );
    const end = breakAt > Math.floor(maxChars / 2) ? breakAt + 1 : maxChars;
    lines.push(remaining.slice(0, end).trim());
    remaining = remaining.slice(end).trim();
  }

  if (remaining) {
    lines.push(remaining);
  }

  return lines;
}

function truncate(text: string, maxLength: number): string {
  return text.length <= maxLength ? text : `${text.slice(0, maxLength - 1)}...`;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
