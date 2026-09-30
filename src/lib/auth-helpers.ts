import "server-only";
import { auth } from "@/auth";
import { db, boards, boardMembers } from "@/lib/db";
import { and, eq } from "drizzle-orm";

export type Role = "owner" | "editor" | "viewer";

export async function currentUser() {
  const session = await auth();
  return session?.user ?? null;
}

export async function requireUser() {
  const user = await currentUser();
  if (!user) throw new HttpError(401, "Sign in required");
  return user;
}

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Resolves the caller's effective role on a board, `null` when no access. */
export async function boardAccess(boardId: string) {
  const user = await currentUser();
  const [board] = await db.select().from(boards).where(eq(boards.id, boardId));
  if (!board) return { board: null, role: null as Role | null, user };

  if (user) {
    if (board.ownerId === user.id) return { board, role: "owner" as Role, user };
    const [m] = await db
      .select()
      .from(boardMembers)
      .where(and(eq(boardMembers.boardId, boardId), eq(boardMembers.userId, user.id)));
    if (m) return { board, role: m.role as Role, user };
  }
  if (board.visibility === "public") return { board, role: "viewer" as Role, user };
  return { board, role: null as Role | null, user };
}

export async function requireEdit(boardId: string) {
  const { board, role, user } = await boardAccess(boardId);
  if (!board) throw new HttpError(404, "Board not found");
  if (role !== "owner" && role !== "editor")
    throw new HttpError(403, "You can only read this board");
  return { board, role, user: user! };
}

export async function requireView(boardId: string) {
  const ctx = await boardAccess(boardId);
  if (!ctx.board) throw new HttpError(404, "Board not found");
  if (!ctx.role) throw new HttpError(403, "This board is private");
  return ctx;
}
