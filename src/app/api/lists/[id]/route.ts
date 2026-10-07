import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, lists } from "@/lib/db";
import { HttpError, requireAdmin } from "@/lib/auth-helpers";
import { route, origin, type Ctx } from "@/lib/route";
import { publish } from "@/lib/events";

type P = { id: string };

async function load(id: string) {
  const [list] = await db.select().from(lists).where(eq(lists.id, id));
  if (!list) throw new HttpError(404, "List not found");
  await requireAdmin(list.boardId);
  return list;
}

const Patch = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  position: z.number().optional(),
  collapsed: z.boolean().optional(),
});

export const PATCH = route<P, unknown>(async (req, { params }: Ctx<P>) => {
  const { id } = await params;
  const existing = await load(id);
  const patch = Patch.parse(await req.json());
  const [list] = await db.update(lists).set(patch).where(eq(lists.id, id)).returning();
  await publish(existing.boardId, { t: "list.upsert", list }, origin(req));
  return list;
});

/** Archive rather than destroy, so a stray click is recoverable. */
export const DELETE = route<P, unknown>(async (req, { params }: Ctx<P>) => {
  const { id } = await params;
  const existing = await load(id);
  await db.delete(lists).where(eq(lists.id, id));
  await publish(existing.boardId, { t: "list.remove", id }, origin(req));
  return { ok: true };
});
