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
  it.each(["monochrome", "color"] as const)("renders a %s PNG card", async (style) => {
    const output = await renderQuoteCard({
      quote,
      avatarUrl: "https://cdn.discordapp.com/avatars/user/avatar.png",
      style,
      fetchImage: async () => avatar()
    });
    const metadata = await sharp(output).metadata();

    expect(metadata.format).toBe("png");
    expect(metadata.width).toBe(1200);
    expect(metadata.height).toBe(630);
  });

  it("renders without a Discord avatar when no image is available", async () => {
    const output = await renderQuoteCard({ quote, style: "color" });

    expect((await sharp(output).metadata()).format).toBe("png");
  });
});
