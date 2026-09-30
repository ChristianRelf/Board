import { z } from "zod";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db, cards, lists } from "@/lib/db";
import { HttpError, requireEdit } from "@/lib/auth-helpers";
import { route, origin, log } from "@/lib/route";
import { publish } from "@/lib/events";
import { STEP } from "@/lib/order";
import { getCard } from "@/lib/board-data";

const Body = z.object({
  listId: z.string(),
  title: z.string().trim().min(1).max(500),
  position: z.number().optional(),
  linkedBoardId: z.string().nullish(),
});

export const POST = route(async (req) => {
  const body = Body.parse(await req.json());
  const [list] = await db.select().from(lists).where(eq(lists.id, body.listId));
  if (!list) throw new HttpError(404, "List not found");
  const { user } = await requireEdit(list.boardId);

  const last = await db
    .select({ position: cards.position })
    .from(cards)
    .where(and(eq(cards.listId, body.listId), isNull(cards.archivedAt)))
    .orderBy(desc(cards.position))
    .limit(1);
  const pos = body.position ?? (last[0]?.position ?? 0) + STEP;

  const [row] = await db
    .insert(cards)
    .values({
      boardId: list.boardId,
      listId: body.listId,
      title: body.title,
      position: pos,
      linkedBoardId: body.linkedBoardId ?? null,
      createdBy: user.id,
    })
    .returning();

  const card = await getCard(row.id);
  await log(list.boardId, user.id, "card.create", { title: row.title }, row.id);
  await publish(list.boardId, { t: "card.upsert", card }, origin(req));
  return card;
});
