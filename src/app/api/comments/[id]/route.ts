import { eq } from "drizzle-orm";
import { db, comments } from "@/lib/db";
import { HttpError, requireEdit } from "@/lib/auth-helpers";
import { route, origin, type Ctx } from "@/lib/route";
import { publish } from "@/lib/events";
import { getCardDetail, loadCard } from "@/lib/board-data";


export const DELETE = route<{ id: string }, unknown>(async (req, { params }) => {
  const { id } = await params;
  const [row] = await db.select().from(comments).where(eq(comments.id, id));
  if (!row) throw new HttpError(404, "Comment not found");
  const card = await loadCard(row.cardId);
  const { user, role } = await requireEdit(card.boardId);
  if (row.userId !== user.id && role !== "owner")
    throw new HttpError(403, "That's not your comment");

  await db.delete(comments).where(eq(comments.id, id));
  const detail = await getCardDetail(row.cardId);
  await publish(card.boardId, { t: "card.detail", card: detail }, origin(req));
  await publish(card.boardId, { t: "card.upsert", card: detail }, origin(req));
  return { ok: true };
});
