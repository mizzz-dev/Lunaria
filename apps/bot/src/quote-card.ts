import sharp from "sharp";

export type QuoteCardStyle = "monochrome" | "color";

export interface QuoteCardContent {
  readonly content: string;
  readonly sourceAuthorName: string;
  readonly sourceChannelName: string;
  readonly sourceCreatedAt: Date;
}

export async function renderQuoteCard(input: {
  readonly quote: QuoteCardContent;
  readonly avatarUrl?: string;
  readonly style: QuoteCardStyle;
  readonly fetchImage?: (url: string) => Promise<Buffer | undefined>;
}): Promise<Buffer> {
  const colors =
    input.style === "monochrome"
      ? {
          background: "#080a0d",
          panel: "#11151c",
          foreground: "#f4f4f5",
          muted: "#a1a1aa",
          accent: "#e4e4e7"
        }
      : {
          background: "#070f26",
          panel: "#152147",
          foreground: "#f5f7ff",
          muted: "#b4c3f4",
          accent: "#8ea8ff"
        };
  const avatar = await loadAvatar(input.avatarUrl, input.fetchImage);
  const portrait = await buildPortrait(avatar, input.style, colors.panel);
  const overlay = buildOverlaySvg(input.quote, input.style, colors);

  return sharp({
    create: {
      width: 1200,
      height: 630,
      channels: 4,
      background: colors.background
    }
  })
    .composite([
      { input: portrait, left: 0, top: 0 },
      { input: Buffer.from(overlay), left: 0, top: 0 }
    ])
    .png()
    .toBuffer();
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
  style: QuoteCardStyle,
  fallbackColor: string
): Promise<Buffer> {
  if (!avatar) {
    return sharp({
      create: {
        width: 570,
        height: 630,
        channels: 4,
        background: fallbackColor
      }
    })
      .png()
      .toBuffer();
  }

  const image = sharp(avatar).resize(570, 630, { fit: "cover", position: "centre" });
  return (style === "monochrome" ? image.grayscale() : image).png().toBuffer();
}

function buildOverlaySvg(
  quote: QuoteCardContent,
  style: QuoteCardStyle,
  colors: {
    readonly background: string;
    readonly foreground: string;
    readonly muted: string;
    readonly accent: string;
  }
): string {
  const normalizedText = quote.content.trim().replace(/\s+/g, " ");
  const fontSize = normalizedText.length > 95 ? 34 : normalizedText.length > 48 ? 42 : 50;
  const maxChars = normalizedText.match(/[^\x00-\xff]/)
    ? Math.floor(510 / fontSize)
    : Math.floor(840 / fontSize);
  const lineWidth = Math.max(maxChars, 10);
  const text = truncate(normalizedText, lineWidth * 5);
  const lines = wrap(text, lineWidth).slice(0, 5);
  const lineHeight = fontSize * 1.55;
  const startY = 250 - ((lines.length - 1) * lineHeight) / 2;
  const quoteLines = lines
    .map(
      (line, index) =>
        `<text x="654" y="${startY + index * lineHeight}" class="quote">${escapeXml(line)}</text>`
    )
    .join("");
  const attribution = `- ${quote.sourceAuthorName}  #${quote.sourceChannelName}`;
  const date = new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(quote.sourceCreatedAt);
  const accentOpacity = style === "monochrome" ? "0.16" : "0.35";

  return `
<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="portraitFade" x1="0" x2="1">
      <stop offset="0.34" stop-color="${colors.background}" stop-opacity="0"/>
      <stop offset="1" stop-color="${colors.background}" stop-opacity="1"/>
    </linearGradient>
    <radialGradient id="accent" cx="78%" cy="18%" r="58%">
      <stop stop-color="${colors.accent}" stop-opacity="${accentOpacity}"/>
      <stop offset="1" stop-color="${colors.accent}" stop-opacity="0"/>
    </radialGradient>
    <style>
      .quote { font: 500 ${fontSize}px "Noto Sans JP", "Yu Gothic UI", "Meiryo", sans-serif; fill: ${colors.foreground}; letter-spacing: 0.02em; }
      .by { font: 400 25px "Noto Sans JP", "Yu Gothic UI", "Meiryo", sans-serif; fill: ${colors.muted}; }
      .brand { font: 700 28px "Segoe UI", sans-serif; fill: ${colors.foreground}; letter-spacing: 0.12em; }
      .meta { font: 400 18px "Segoe UI", sans-serif; fill: ${colors.muted}; letter-spacing: 0.06em; }
    </style>
  </defs>
  <rect width="1200" height="630" fill="url(#accent)"/>
  <rect x="260" width="410" height="630" fill="url(#portraitFade)"/>
  <text x="654" y="130" fill="${colors.accent}" font-size="72" font-family="Georgia, serif">"</text>
  ${quoteLines}
  <text x="654" y="425" class="by">${escapeXml(attribution)}</text>
  <text x="654" y="458" class="meta">${escapeXml(date)}</text>
  <path d="M654 531 h34 l12 18 16-36 17 36 12-18 h34" fill="none" stroke="${colors.accent}" stroke-width="3"/>
  <text x="798" y="542" class="brand">LUNARIA QUOTE</text>
</svg>`;
}

function wrap(text: string, maxChars: number): string[] {
  const lines: string[] = [];
  let remaining = text;

  while (remaining.length > maxChars) {
    const segment = remaining.slice(0, maxChars + 1);
    const breakAt = Math.max(segment.lastIndexOf(" "), segment.lastIndexOf("、"), segment.lastIndexOf("。"));
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
