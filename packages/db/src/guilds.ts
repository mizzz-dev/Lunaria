import type { PrismaClient } from "@prisma/client";

export async function ensureGuild(
  prisma: PrismaClient,
  input: {
    readonly id: string;
    readonly name?: string;
  }
): Promise<void> {
  await prisma.guild.upsert({
    where: { id: input.id },
    create: {
      id: input.id,
      ...(input.name ? { name: input.name } : {})
    },
    update: input.name ? { name: input.name } : {}
  });
}
