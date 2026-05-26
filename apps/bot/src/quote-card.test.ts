import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { renderQuoteCard } from "./quote-card.js";

const quote = {
  content: "カラーと白黒のどちらでも名言カードにできます。",
  sourceAuthorName: "Lunaria User",
  sourceChannelName: "general",
  sourceCreatedAt: new Date("2026-05-26T00:00:00.000Z")
};

async function avatar(): Promise<Buffer> {
  return sharp({
    create: {
      width: 256,
      height: 256,
      channels: 4,
      background: "#5787dc"
    }
  })
    .png()
    .toBuffer();
}

describe("quote card renderer", () => {
  it.each([
    ["anime", "color", "left"],
    ["manga", "white", "right"],
    ["neon", "black", "left"],
    ["cinema", "color", "right"]
  ] as const)("renders a %s card in %s with the portrait on the %s", async (design, theme, avatarPosition) => {
    const output = await renderQuoteCard({
      quote,
      portraitUrl: "https://cdn.discordapp.com/avatars/user/avatar.png",
      appearance: { design, theme, avatarPosition },
      fetchImage: async () => avatar()
    });
    const metadata = await sharp(output).metadata();

    expect(metadata.format).toBe("png");
    expect(metadata.width).toBe(1200);
    expect(metadata.height).toBe(630);
  });

  it("renders without a Discord avatar when no image is available", async () => {
    const output = await renderQuoteCard({
      quote,
      appearance: { design: "anime", theme: "white", avatarPosition: "right" }
    });

    expect((await sharp(output).metadata()).format).toBe("png");
  });
});
