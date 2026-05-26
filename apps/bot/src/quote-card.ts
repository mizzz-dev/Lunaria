import sharp from "sharp";

export type QuoteCardTheme = "color" | "black" | "white";
export type QuoteCardAvatarPosition = "left" | "right";
export type QuoteCardDesign = "anime" | "manga" | "neon" | "cinema";

export interface QuoteCardAppearance {
  readonly theme: QuoteCardTheme;
  readonly avatarPosition: QuoteCardAvatarPosition;
  readonly design: QuoteCardDesign;
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
  readonly accent2: string;
  readonly border: string;
}

const width = 1200;
const height = 630;
const portraitWidth = 520;

export async function renderQuoteCard(input: {
  readonly quote: QuoteCardContent;
  readonly portraitUrl?: string;
  readonly appearance: QuoteCardAppearance;
  readonly fetchImage?: (url: string) => Promise<Buffer | undefined>;
}): Promise<Buffer> {
  const colors = palette(input.appearance);
  const portraitSource = await loadPortrait(input.portraitUrl, input.fetchImage);
  const portrait = await buildPortrait(portraitSource, input.appearance, colors.surface);
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

function palette(appearance: QuoteCardAppearance): QuoteCardPalette {
  if (appearance.theme === "white") {
    const accents = {
      anime: ["#e45c82", "#3c93c9"],
      manga: ["#171717", "#8d8d8d"],
      neon: ["#007f91", "#db458a"],
      cinema: ["#a7763e", "#5a4b3a"]
    } as const;
    const [accent, accent2] = accents[appearance.design];
    return {
      background: "#fbf8f1",
      surface: "#eae4da",
      foreground: "#161514",
      muted: "#71685d",
      accent,
      accent2,
      border: "#d8d0c1"
    };
  }

  if (appearance.theme === "black") {
    const accents = {
      anime: ["#f477ab", "#65c9ff"],
      manga: ["#f4f1e9", "#7b7b79"],
      neon: ["#28eed7", "#fd4aa8"],
      cinema: ["#d2b784", "#5c5141"]
    } as const;
    const [accent, accent2] = accents[appearance.design];
    return {
      background: "#08080a",
      surface: "#191a1f",
      foreground: "#faf6ee",
      muted: "#aaa39a",
      accent,
      accent2,
      border: "#2d2a29"
    };
  }

  const palettes = {
    anime: {
      background: "#11172b",
      surface: "#283453",
      foreground: "#fffaf2",
      muted: "#bbc6db",
      accent: "#ff719d",
      accent2: "#66d8ff",
      border: "#2e3a59"
    },
    manga: {
      background: "#151515",
      surface: "#262626",
      foreground: "#fffdf8",
      muted: "#cbc7bc",
      accent: "#ffffff",
      accent2: "#d74343",
      border: "#3a3936"
    },
    neon: {
      background: "#071523",
      surface: "#102d39",
      foreground: "#f1ffff",
      muted: "#96c5cf",
      accent: "#21e9d7",
      accent2: "#fb4ba9",
      border: "#164052"
    },
    cinema: {
      background: "#10161b",
      surface: "#1b2930",
      foreground: "#faf5eb",
      muted: "#a8b4b8",
      accent: "#d7a052",
      accent2: "#4c6470",
      border: "#293640"
    }
  } as const;

  return palettes[appearance.design];
}

async function loadPortrait(
  portraitUrl: string | undefined,
  fetchImage?: (url: string) => Promise<Buffer | undefined>
): Promise<Buffer | undefined> {
  if (!portraitUrl) {
    return undefined;
  }

  if (fetchImage) {
    return fetchImage(portraitUrl);
  }

  try {
    const url = new URL(portraitUrl);
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
  portrait: Buffer | undefined,
  appearance: QuoteCardAppearance,
  fallbackColor: string
): Promise<Buffer> {
  if (!portrait) {
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

  const image = sharp(portrait)
    .resize(portraitWidth, height, { fit: "cover", position: "centre" })
    .sharpen({ sigma: 0.7 });

  if (appearance.design === "manga") {
    return image.grayscale().linear(1.18, -20).png().toBuffer();
  }

  if (appearance.theme === "black") {
    return image.grayscale().modulate({ brightness: 0.88 }).png().toBuffer();
  }

  return image.modulate({ saturation: appearance.design === "anime" ? 1.2 : 1.08 }).png().toBuffer();
}

function buildOverlaySvg(
  quote: QuoteCardContent,
  appearance: QuoteCardAppearance,
  colors: QuoteCardPalette
): string {
  const isPortraitLeft = appearance.avatarPosition === "left";
  const textX = isPortraitLeft ? 596 : 64;
  const textWidth = 538;
  const normalizedText = quote.content.trim().replace(/\s+/g, " ");
  const fontSize = normalizedText.length > 108 ? 32 : normalizedText.length > 52 ? 40 : 48;
  const lineWidth = Math.max(Math.floor(textWidth / (fontSize * 0.93)), 10);
  const lines = wrap(truncate(normalizedText, lineWidth * 5), lineWidth).slice(0, 5);
  const lineHeight = fontSize * 1.55;
  const startY = 236 - ((lines.length - 1) * lineHeight) / 2;
  const quoteLines = lines
    .map(
      (line, index) =>
        `<text x="${textX}" y="${startY + index * lineHeight}" class="quote">${escapeXml(line)}</text>`
    )
    .join("");
  const meta = `#${quote.sourceChannelName} / ${new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(quote.sourceCreatedAt)}`;
  const fadeX = isPortraitLeft ? 216 : 660;
  const fadeTransform = isPortraitLeft ? "" : ' gradientTransform="rotate(180 0.5 0.5)"';
  const glowX = isPortraitLeft ? "84%" : "16%";
  const decoration = designDecoration(appearance, colors, textX, textWidth);
  const typography = designTypography(appearance.design, fontSize);
  const label = {
    anime: "ANIME FRAME / ORIGINAL",
    manga: "MANGA PANEL / ORIGINAL",
    neon: "NEON STREAM / ORIGINAL",
    cinema: "CINEMA ARCHIVE / ORIGINAL"
  }[appearance.design];

  return `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="portraitFade" x1="0" x2="1"${fadeTransform}>
      <stop offset="0" stop-color="${colors.background}" stop-opacity="0"/>
      <stop offset="1" stop-color="${colors.background}" stop-opacity="1"/>
    </linearGradient>
    <radialGradient id="glow" cx="${glowX}" cy="15%" r="58%">
      <stop stop-color="${colors.accent}" stop-opacity="0.2"/>
      <stop offset="0.46" stop-color="${colors.accent2}" stop-opacity="0.1"/>
      <stop offset="1" stop-color="${colors.accent}" stop-opacity="0"/>
    </radialGradient>
    <pattern id="grain" width="18" height="18" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="4" r="0.7" fill="${colors.foreground}" opacity="0.042"/>
      <circle cx="13" cy="10" r="0.6" fill="${colors.foreground}" opacity="0.033"/>
      <circle cx="7" cy="16" r="0.5" fill="${colors.foreground}" opacity="0.038"/>
    </pattern>
    <style>
      .quote { ${typography.quote}; fill: ${colors.foreground}; }
      .author { font: 650 25px "Yu Gothic UI", "Noto Sans JP", sans-serif; fill: ${colors.foreground}; letter-spacing: 0.045em; }
      .meta { font: 400 16px "Segoe UI", "Noto Sans JP", sans-serif; fill: ${colors.muted}; letter-spacing: 0.14em; }
      .brand { font: 650 18px "Georgia", serif; fill: ${colors.muted}; letter-spacing: 0.34em; }
      .serial { font: 600 12px "Segoe UI", sans-serif; fill: ${colors.muted}; letter-spacing: 0.26em; }
    </style>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#glow)"/>
  <rect x="${fadeX}" width="324" height="${height}" fill="url(#portraitFade)"/>
  <rect width="${width}" height="${height}" fill="url(#grain)"/>
  ${decoration}
  <text x="${textX}" y="74" class="serial">${label}</text>
  <line x1="${textX}" y1="98" x2="${textX + textWidth}" y2="98" stroke="${colors.border}"/>
  <text x="${textX}" y="156" fill="${colors.accent}" font-size="66" font-family="Georgia, serif">“</text>
  ${quoteLines}
  <line x1="${textX}" y1="452" x2="${textX + 52}" y2="452" stroke="${colors.accent}" stroke-width="3"/>
  <text x="${textX + 70}" y="462" class="author">${escapeXml(quote.sourceAuthorName)}</text>
  <text x="${textX + 70}" y="493" class="meta">${escapeXml(meta)}</text>
  <text x="${textX}" y="560" class="brand">LUNARIA</text>
  <text x="${textX + 422}" y="560" class="serial">QUOTE / 2026</text>
</svg>`;
}

function designTypography(
  design: QuoteCardDesign,
  fontSize: number
): { readonly quote: string } {
  switch (design) {
    case "anime":
      return { quote: `font: 700 ${fontSize}px "Yu Gothic UI", "Noto Sans JP", sans-serif; letter-spacing: 0.055em;` };
    case "manga":
      return { quote: `font: 800 ${fontSize}px "Yu Gothic", "Noto Sans JP", sans-serif; letter-spacing: 0.065em;` };
    case "neon":
      return { quote: `font: 650 ${fontSize}px "Yu Gothic UI", "Noto Sans JP", sans-serif; letter-spacing: 0.07em;` };
    case "cinema":
      return { quote: `font: 500 ${fontSize}px "Yu Mincho", "Hiragino Mincho ProN", "Noto Serif JP", serif; letter-spacing: 0.045em;` };
  }
}

function designDecoration(
  appearance: QuoteCardAppearance,
  colors: QuoteCardPalette,
  textX: number,
  textWidth: number
): string {
  switch (appearance.design) {
    case "anime":
      return `
  <rect x="25" y="25" width="1150" height="580" rx="18" fill="none" stroke="${colors.border}"/>
  <path d="M${textX + textWidth - 110} 34 l92 0 l-58 64 l-92 0 z" fill="${colors.accent}" opacity="0.76"/>
  <circle cx="${textX + textWidth - 22}" cy="128" r="4" fill="${colors.accent2}"/>
  <path d="M${textX + textWidth - 55} 144 l8 18 l18 8 l-18 8 l-8 18 l-8-18 l-18-8 l18-8 z" fill="${colors.accent2}" opacity="0.78"/>`;
    case "manga":
      return `
  <defs>
    <pattern id="halftone" width="10" height="10" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1.15" fill="${colors.foreground}" opacity="0.18"/>
    </pattern>
  </defs>
  <rect x="22" y="22" width="1156" height="586" fill="none" stroke="${colors.foreground}" stroke-width="4"/>
  <rect x="${textX - 20}" y="112" width="${textWidth + 34}" height="337" fill="url(#halftone)" opacity="0.34"/>
  <path d="M${textX + textWidth - 135} 22 h135 v58 h-183 z" fill="${colors.foreground}"/>
  <text x="${textX + textWidth - 164}" y="59" fill="${colors.background}" font-size="18" font-family="sans-serif" font-weight="800">PANEL 01</text>`;
    case "neon":
      return `
  <defs>
    <pattern id="scanlines" width="8" height="8" patternUnits="userSpaceOnUse">
      <path d="M0 7.5 h1200" stroke="${colors.accent}" stroke-width="1" opacity="0.055"/>
    </pattern>
  </defs>
  <rect x="22" y="22" width="1156" height="586" rx="10" fill="none" stroke="${colors.accent}" stroke-opacity="0.4"/>
  <rect width="1200" height="630" fill="url(#scanlines)"/>
  <path d="M${textX + textWidth - 174} 43 h164 v48 h-164 z" fill="none" stroke="${colors.accent2}" stroke-width="2"/>
  <circle cx="${textX + textWidth - 147}" cy="67" r="7" fill="${colors.accent2}"/>
  <text x="${textX + textWidth - 130}" y="73" fill="${colors.accent2}" font-size="17" font-family="monospace">REC</text>`;
    case "cinema":
      return `
  <rect x="28" y="28" width="1144" height="574" rx="3" fill="none" stroke="${colors.border}"/>
  <line x1="28" y1="54" x2="1172" y2="54" stroke="${colors.border}"/>
  <line x1="28" y1="577" x2="1172" y2="577" stroke="${colors.border}"/>`;
  }
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
