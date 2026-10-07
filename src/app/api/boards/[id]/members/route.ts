import { z } from "zod";
import { and, eq, ilike, ne, or } from "drizzle-orm";
import { db, boardMembers, users } from "@/lib/db";
import { HttpError, requireAdmin, requireUser } from "@/lib/auth-helpers";
import { route, origin, type Ctx } from "@/lib/route";
import { publish } from "@/lib/events";

type P = { id: string };

async function membersOf(boardId: string) {
  return db
    .select({ id: users.id, name: users.name, image: users.image, role: boardMembers.role })
    .from(boardMembers)
    .innerJoin(users, eq(users.id, boardMembers.userId))
    .where(eq(boardMembers.boardId, boardId));
}

/** People you can invite: anyone who has signed in (allowlisted at the door). */
export const GET = route<P, unknown>(async (req, { params }: Ctx<P>) => {
  const { id } = await params;
  await requireUser();
  await requireAdmin(id);
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  const rows = await db
    .select({ id: users.id, name: users.name, image: users.image })
    .from(users)
    .where(
      q
        ? or(ilike(users.name, `%${q}%`), ilike(users.email, `%${q}%`))
        : ne(users.id, ""),
    )
    .limit(20);
  return rows;
});

const Body = z.object({
  userId: z.string(),
  role: z.enum(["admin", "editor", "viewer"]).default("editor"),
});

export const POST = route<P, unknown>(async (req, { params }: Ctx<P>) => {
  const { id } = await params;
  const { board } = await requireAdmin(id);
  const { userId, role } = Body.parse(await req.json());
  if (userId === board.ownerId) throw new HttpError(422, "The owner always retains admin access");
  const [person] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId));
  if (!person) throw new HttpError(404, "Person not found");
  await db
    .insert(boardMembers)
    .values({ boardId: id, userId, role })
    .onConflictDoUpdate({
      target: [boardMembers.boardId, boardMembers.userId],
      set: { role },
    });
  const members = await membersOf(id);
  await publish(id, { t: "members", members }, origin(req));
  return members;
});

export const DELETE = route<P, unknown>(async (req, { params }: Ctx<P>) => {
  const { id } = await params;
  const { board } = await requireAdmin(id);
  const userId = new URL(req.url).searchParams.get("userId");
  if (!userId) throw new HttpError(422, "userId required");
  if (userId === board.ownerId) throw new HttpError(422, "The owner can't be removed");
  await db
    .delete(boardMembers)
    .where(and(eq(boardMembers.boardId, id), eq(boardMembers.userId, userId)));
  const members = await membersOf(id);
  await publish(id, { t: "members", members }, origin(req));
  return members;
});
