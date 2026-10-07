import { z } from "zod";
import { desc, eq } from "drizzle-orm";
import { db, checkItems } from "@/lib/db";
import { requireEdit } from "@/lib/auth-helpers";
import { route, origin, type Ctx } from "@/lib/route";
import { publish } from "@/lib/events";
import { getCardDetail, loadCard } from "@/lib/board-data";
import { STEP } from "@/lib/order";


type P = { id: string };

export const POST = route<P, unknown>(async (req, { params }: Ctx<P>) => {
  const { id } = await params;
  const card = await loadCard(id);
  await requireEdit(card.boardId);
  const { text, itemId } = z.object({ itemId: z.string().uuid().optional(), text: z.string().trim().min(1).max(500) }).parse(await req.json());

  const last = await db
    .select({ position: checkItems.position })
    .from(checkItems)
    .where(eq(checkItems.cardId, id))
    .orderBy(desc(checkItems.position))
    .limit(1);

  await db
    .insert(checkItems)
    .values({ id: itemId, cardId: id, text, position: (last[0]?.position ?? 0) + STEP });

  const detail = await getCardDetail(id);
  await publish(card.boardId, { t: "card.detail", card: detail }, origin(req));
  await publish(card.boardId, { t: "card.upsert", card: detail }, origin(req));
  return detail;
});
