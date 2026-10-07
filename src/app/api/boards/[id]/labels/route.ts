import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db, labels } from "@/lib/db";
import { HttpError, requireEdit } from "@/lib/auth-helpers";
import { route, origin } from "@/lib/route";
import { publish } from "@/lib/events";

export const PATCH = route<{ id: string }, unknown>(async (req, { params }) => {
  const { id } = await params;
  await requireEdit(id);
  const { ids } = z
    .object({ ids: z.array(z.string()).max(1000) })
    .parse(await req.json());
  const current = await db.select().from(labels).where(eq(labels.boardId, id));
  if (
    new Set(ids).size !== current.length ||
    ids.length !== current.length ||
    current.some((l) => !ids.includes(l.id))
  )
    throw new HttpError(
      422,
      "Labels changed. Reopen the picker and try again.",
    );
  const rows = await db.transaction(async (tx) => {
    const result = [];
    for (const [i, labelId] of ids.entries()) {
      const [row] = await tx
        .update(labels)
        .set({ position: i * 1024 })
        .where(and(eq(labels.id, labelId), eq(labels.boardId, id)))
        .returning();
      result.push(row);
    }
    return result;
  });
  for (const label of rows)
    await publish(id, { t: "label.upsert", label }, origin(req));
  return rows;
});
