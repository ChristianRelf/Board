import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db, cardLabels, labels } from "@/lib/db";
import { HttpError, requireEdit } from "@/lib/auth-helpers";
import { route, origin, type Ctx } from "@/lib/route";
import { publish } from "@/lib/events";
import { getCard, loadCard } from "@/lib/board-data";


type P = { id: string };

/** Toggle a label on a card. */
export const POST = route<P, unknown>(async (req, { params }: Ctx<P>) => {
  const { id } = await params;
  const card = await loadCard(id);
  await requireEdit(card.boardId);
  const { labelId, on } = z
    .object({ labelId: z.string(), on: z.boolean() })
    .parse(await req.json());

  const [label] = await db.select().from(labels).where(and(eq(labels.id, labelId), eq(labels.boardId, card.boardId)));
  if (!label) throw new HttpError(422, "Label is not on this board");
  if (on)
    await db.insert(cardLabels).values({ cardId: id, labelId }).onConflictDoNothing();
  else
    await db
      .delete(cardLabels)
      .where(and(eq(cardLabels.cardId, id), eq(cardLabels.labelId, labelId)));

  const next = await getCard(id);
  await publish(card.boardId, { t: "card.upsert", card: next }, origin(req));
  return next;
});
