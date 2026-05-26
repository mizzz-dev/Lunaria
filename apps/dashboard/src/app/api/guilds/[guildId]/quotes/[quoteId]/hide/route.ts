import { NextResponse, type NextRequest } from "next/server";
import { requireManageableGuild } from "../../../../../../../lib/auth";
import {
  createQuoteService,
  managedActor,
  quoteErrorResponse
} from "../../route";

type RouteContext = {
  params: Promise<{
    guildId: string;
    quoteId: string;
  }>;
};

export async function POST(_request: NextRequest, context: RouteContext) {
  const { guildId, quoteId } = await context.params;

  try {
    const session = await requireManageableGuild(guildId);
    const quote = await createQuoteService().hide({
      actor: managedActor(guildId, session.user.id),
      guildId,
      quoteId
    });

    return NextResponse.json({ quote });
  } catch (error) {
    return quoteErrorResponse(error);
  }
}
