import { z } from "zod";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db, lists } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-helpers";
import { route, origin } from "@/lib/route";
import { publish } from "@/lib/events";
import { STEP } from "@/lib/order";

const Body = z.object({
  boardId: z.string(),
  title: z.string().trim().min(1).max(120),
  position: z.number().optional(),
});

export const POST = route(async (req) => {
  const { boardId, title, position } = Body.parse(await req.json());
  await requireAdmin(boardId);
  const last = await db
    .select({ position: lists.position })
    .from(lists)
    .where(and(eq(lists.boardId, boardId), isNull(lists.archivedAt)))
    .orderBy(desc(lists.position))
    .limit(1);
  const pos = position ?? (last[0]?.position ?? 0) + STEP;

  const [list] = await db.insert(lists).values({ boardId, title, position: pos }).returning();
  await publish(boardId, { t: "list.upsert", list }, origin(req));
  return list;
});
