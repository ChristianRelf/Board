import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, labels } from "@/lib/db";
import { requireEdit } from "@/lib/auth-helpers";
import { route, origin } from "@/lib/route";
import { publish } from "@/lib/events";

export const POST = route(async (req) => {
  const { boardId, color, name } = z
    .object({
      boardId: z.string(),
      color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      name: z.string().trim().max(60).nullish(),
    })
    .parse(await req.json());
  await requireEdit(boardId);
  const [last] = await db.select({ position: labels.position }).from(labels).where(eq(labels.boardId, boardId)).orderBy(desc(labels.position)).limit(1);
  const [label] = await db.insert(labels).values({ boardId, color, name, position: (last?.position ?? 0) + 1024 }).returning();
  await publish(boardId, { t: "label.upsert", label }, origin(req));
  return label;
});
