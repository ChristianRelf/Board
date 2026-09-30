import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, checkItems } from "@/lib/db";
import { HttpError, requireEdit } from "@/lib/auth-helpers";
import { route, origin } from "@/lib/route";
import { publish } from "@/lib/events";
import { getCardDetail, loadCard } from "@/lib/board-data";


async function load(id: string) {
  const [row] = await db.select().from(checkItems).where(eq(checkItems.id, id));
  if (!row) throw new HttpError(404, "Item not found");
  const card = await loadCard(row.cardId);
  await requireEdit(card.boardId);
  return { row, card };
}

export const PATCH = route<{ id: string }, unknown>(async (req, { params }) => {
  const { id } = await params;
  const { row, card } = await load(id);
  const patch = z
    .object({
      text: z.string().trim().min(1).max(500).optional(),
      done: z.boolean().optional(),
      position: z.number().optional(),
    })
    .parse(await req.json());
  await db.update(checkItems).set(patch).where(eq(checkItems.id, id));
  const detail = await getCardDetail(row.cardId);
  await publish(card.boardId, { t: "card.detail", card: detail }, origin(req));
  await publish(card.boardId, { t: "card.upsert", card: detail }, origin(req));
  return detail;
});

export const DELETE = route<{ id: string }, unknown>(async (req, { params }) => {
  const { id } = await params;
  const { row, card } = await load(id);
  await db.delete(checkItems).where(eq(checkItems.id, id));
  const detail = await getCardDetail(row.cardId);
  await publish(card.boardId, { t: "card.detail", card: detail }, origin(req));
  await publish(card.boardId, { t: "card.upsert", card: detail }, origin(req));
  return { ok: true };
});
