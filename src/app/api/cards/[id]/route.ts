import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, cards } from "@/lib/db";
import { requireEdit, requireView } from "@/lib/auth-helpers";
import { route, origin, log, type Ctx } from "@/lib/route";
import { publish } from "@/lib/events";
import { getCard, getCardDetail, loadCard } from "@/lib/board-data";

type P = { id: string };

export const GET = route<P, unknown>(async (_req, { params }: Ctx<P>) => {
  const { id } = await params;
  const card = await loadCard(id);
  await requireView(card.boardId);
  return getCardDetail(id);
});

const Patch = z.object({
  title: z.string().trim().min(1).max(500).optional(),
  description: z.string().max(20_000).nullish(),
  listId: z.string().optional(),
  position: z.number().optional(),
  startAt: z.string().datetime().nullish(),
  dueAt: z.string().datetime().nullish(),
  dueDone: z.boolean().optional(),
  cover: z.string().nullish(),
  linkedBoardId: z.string().nullish(),
  archived: z.boolean().optional(),
});

export const PATCH = route<P, unknown>(async (req, { params }: Ctx<P>) => {
  const { id } = await params;
  const existing = await loadCard(id);
  const { user } = await requireEdit(existing.boardId);
  const { archived, startAt, dueAt, ...rest } = Patch.parse(await req.json());

  await db
    .update(cards)
    .set({
      ...rest,
      ...(startAt !== undefined ? { startAt: startAt ? new Date(startAt) : null } : {}),
      ...(dueAt !== undefined ? { dueAt: dueAt ? new Date(dueAt) : null } : {}),
      ...(archived !== undefined ? { archivedAt: archived ? new Date() : null } : {}),
      updatedAt: new Date(),
    })
    .where(eq(cards.id, id));

  if (archived) {
    await log(existing.boardId, user.id, "card.archive", { title: existing.title }, id);
    await publish(existing.boardId, { t: "card.remove", id }, origin(req));
    return { ok: true };
  }

  const card = await getCard(id);
  if (rest.listId && rest.listId !== existing.listId)
    await log(existing.boardId, user.id, "card.move", { title: existing.title }, id);
  await publish(existing.boardId, { t: "card.upsert", card }, origin(req));
  return card;
});

export const DELETE = route<P, unknown>(async (req, { params }: Ctx<P>) => {
  const { id } = await params;
  const existing = await loadCard(id);
  const { user } = await requireEdit(existing.boardId);
  await db.delete(cards).where(eq(cards.id, id));
  await log(existing.boardId, user.id, "card.delete", { title: existing.title });
  await publish(existing.boardId, { t: "card.remove", id }, origin(req));
  return { ok: true };
});
