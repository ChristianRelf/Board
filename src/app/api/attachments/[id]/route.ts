import { and, eq, sql } from "drizzle-orm";
import { db, attachments, boardBackups, cards } from "@/lib/db";
import { HttpError, requireEdit } from "@/lib/auth-helpers";
import { route, origin } from "@/lib/route";
import { publish } from "@/lib/events";
import { getCardDetail, loadCard } from "@/lib/board-data";
import { removeUpload } from "@/lib/storage";


export const DELETE = route<{ id: string }, unknown>(async (req, { params }) => {
  const { id } = await params;
  const [row] = await db.select().from(attachments).where(eq(attachments.id, id));
  if (!row) throw new HttpError(404, "Attachment not found");
  const card = await loadCard(row.cardId);
  await requireEdit(card.boardId);

  await db.delete(attachments).where(eq(attachments.id, id));
  const [backup] = await db.select({ id: boardBackups.id }).from(boardBackups)
    .where(and(eq(boardBackups.boardId, card.boardId), sql`${boardBackups.data}::text LIKE ${'%' + row.url + '%'}`)).limit(1);
  const [cover] = await db.select({ id: cards.id }).from(cards).where(eq(cards.cover, row.url)).limit(1);
  if (row.kind === "file" && !backup && !cover) await removeUpload(row.url);

  const detail = await getCardDetail(row.cardId);
  await publish(card.boardId, { t: "card.detail", card: detail }, origin(req));
  await publish(card.boardId, { t: "card.upsert", card: detail }, origin(req));
  return { ok: true };
});
