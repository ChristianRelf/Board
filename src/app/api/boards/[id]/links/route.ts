import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db, boardLinks, boards } from "@/lib/db";
import { HttpError, requireEdit, requireView } from "@/lib/auth-helpers";
import { route, origin, type Ctx } from "@/lib/route";
import { publish } from "@/lib/events";

type P = { id: string };

/** Board-to-board links, created by dropping one board card onto another. */
export const POST = route<P, unknown>(async (req, { params }: Ctx<P>) => {
  const { id } = await params;
  await requireEdit(id);
  const { toBoardId } = z.object({ toBoardId: z.string() }).parse(await req.json());
  if (toBoardId === id) throw new HttpError(422, "A board can't link to itself");
  await requireView(toBoardId);
  await db
    .insert(boardLinks)
    .values({ fromBoardId: id, toBoardId })
    .onConflictDoNothing();
  await publish(id, { t: "reload" }, origin(req));
  const [ref] = await db.select().from(boards).where(eq(boards.id, toBoardId));
  return ref;
});

export const DELETE = route<P, unknown>(async (req, { params }: Ctx<P>) => {
  const { id } = await params;
  await requireEdit(id);
  const to = new URL(req.url).searchParams.get("toBoardId");
  if (!to) throw new HttpError(422, "toBoardId required");
  await db
    .delete(boardLinks)
    .where(and(eq(boardLinks.fromBoardId, id), eq(boardLinks.toBoardId, to)));
  await publish(id, { t: "reload" }, origin(req));
  return { ok: true };
});
