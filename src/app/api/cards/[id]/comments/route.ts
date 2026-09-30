import { z } from "zod";
import { db, comments } from "@/lib/db";
import { requireEdit } from "@/lib/auth-helpers";
import { route, origin, log, type Ctx } from "@/lib/route";
import { publish } from "@/lib/events";
import { getCardDetail, loadCard } from "@/lib/board-data";


type P = { id: string };

export const POST = route<P, unknown>(async (req, { params }: Ctx<P>) => {
  const { id } = await params;
  const card = await loadCard(id);
  const { user } = await requireEdit(card.boardId);
  const { body } = z.object({ body: z.string().trim().min(1).max(4000) }).parse(await req.json());

  await db.insert(comments).values({ cardId: id, userId: user.id, body });
  await log(card.boardId, user.id, "comment", { body: body.slice(0, 140) }, id);
  const detail = await getCardDetail(id);
  await publish(card.boardId, { t: "card.detail", card: detail }, origin(req));
  await publish(card.boardId, { t: "card.upsert", card: detail }, origin(req));
  return detail;
});
