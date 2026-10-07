import { BackgroundInput } from "@/lib/appearance";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, boards } from "@/lib/db";
import { HttpError, requireAdmin, requireView } from "@/lib/auth-helpers";
import { route, origin, type Ctx } from "@/lib/route";
import { getSnapshot } from "@/lib/board-data";
import { publish } from "@/lib/events";

type P = { id: string };

export const GET = route<P, unknown>(async (_req, { params }: Ctx<P>) => {
  const { id } = await params;
  const { role } = await requireView(id);
  return getSnapshot(id, role!);
});

const Patch = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  description: z.string().max(2000).nullish(),
  visibility: z.enum(["private", "public"]).optional(),
  starred: z.boolean().optional(),
  background: BackgroundInput.nullish(),
});

export const PATCH = route<P, unknown>(async (req, { params }: Ctx<P>) => {
  const { id } = await params;
  await requireAdmin(id);
  const patch = Patch.parse(await req.json());
  const [board] = await db
    .update(boards)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(boards.id, id))
    .returning();
  await publish(id, { t: "board", board }, origin(req));
  return board;
});

export const DELETE = route<P, unknown>(async (req, { params }: Ctx<P>) => {
  const { id } = await params;
  const { role } = await requireAdmin(id);
  if (role !== "owner") throw new HttpError(403, "Only the owner can delete this board");
  await db.delete(boards).where(eq(boards.id, id));
  await publish(id, { t: "reload" }, origin(req));
  return { ok: true };
});
