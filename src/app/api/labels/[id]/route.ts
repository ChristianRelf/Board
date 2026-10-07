import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, labels } from "@/lib/db";
import { HttpError, requireEdit } from "@/lib/auth-helpers";
import { route, origin } from "@/lib/route";
import { publish } from "@/lib/events";

async function load(id: string) {
  const [row] = await db.select().from(labels).where(eq(labels.id, id));
  if (!row) throw new HttpError(404, "Label not found");
  await requireEdit(row.boardId);
  return row;
}

export const PATCH = route<{ id: string }, unknown>(async (req, { params }) => {
  const { id } = await params;
  const row = await load(id);
  const patch = z
    .object({
      name: z.string().trim().max(60).nullish(),
      position: z.number().finite().optional(),
      color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    })
    .parse(await req.json());
  const [label] = await db.update(labels).set(patch).where(eq(labels.id, id)).returning();
  await publish(row.boardId, { t: "label.upsert", label }, origin(req));
  return label;
});

export const DELETE = route<{ id: string }, unknown>(async (req, { params }) => {
  const { id } = await params;
  const row = await load(id);
  await db.delete(labels).where(eq(labels.id, id));
  await publish(row.boardId, { t: "label.remove", id }, origin(req));
  return { ok: true };
});
