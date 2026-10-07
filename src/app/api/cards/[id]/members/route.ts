import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db, cardMembers, boardMembers } from "@/lib/db";
import { HttpError, requireEdit } from "@/lib/auth-helpers";
import { route, origin, type Ctx } from "@/lib/route";
import { publish } from "@/lib/events";
import { getCard, loadCard } from "@/lib/board-data";


type P = { id: string };

/** Toggle a member on a card. */
export const POST = route<P, unknown>(async (req, { params }: Ctx<P>) => {
  const { id } = await params;
  const card = await loadCard(id);
  await requireEdit(card.boardId);
  const { userId, on } = z
    .object({ userId: z.string(), on: z.boolean() })
    .parse(await req.json());

  const [member] = await db.select().from(boardMembers).where(and(eq(boardMembers.userId, userId), eq(boardMembers.boardId, card.boardId)));
  if (on && !member) throw new HttpError(422, "Person is not on this board");
  if (on)
    await db.insert(cardMembers).values({ cardId: id, userId }).onConflictDoNothing();
  else
    await db
      .delete(cardMembers)
      .where(and(eq(cardMembers.cardId, id), eq(cardMembers.userId, userId)));

  const next = await getCard(id);
  await publish(card.boardId, { t: "card.upsert", card: next }, origin(req));
  return next;
});
