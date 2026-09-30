import { desc, eq } from "drizzle-orm";
import { db, activity, users } from "@/lib/db";
import { requireView } from "@/lib/auth-helpers";
import { route, type Ctx } from "@/lib/route";

export const GET = route<{ id: string }, unknown>(async (_req, { params }: Ctx<{ id: string }>) => {
  const { id } = await params;
  await requireView(id);
  const rows = await db
    .select({
      id: activity.id,
      type: activity.type,
      data: activity.data,
      createdAt: activity.createdAt,
      cardId: activity.cardId,
      user: { id: users.id, name: users.name, image: users.image },
    })
    .from(activity)
    .leftJoin(users, eq(users.id, activity.userId))
    .where(eq(activity.boardId, id))
    .orderBy(desc(activity.createdAt))
    .limit(60);
  return rows;
});
