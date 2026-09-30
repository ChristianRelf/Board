import { eq } from "drizzle-orm";
import { db, attachments } from "@/lib/db";
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
  if (row.kind === "file") await removeUpload(row.url);

  const detail = await getCardDetail(row.cardId);
  await publish(card.boardId, { t: "card.detail", card: detail }, origin(req));
  await publish(card.boardId, { t: "card.upsert", card: detail }, origin(req));
  return { ok: true };
});
