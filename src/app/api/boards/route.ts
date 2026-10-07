import { BackgroundInput } from "@/lib/appearance";
import { z } from "zod";
import { db, boards, boardMembers, labels, lists } from "@/lib/db";
import { requireUser } from "@/lib/auth-helpers";
import { route } from "@/lib/route";
import { listBoards } from "@/lib/board-data";
import { LABEL_COLORS } from "@/lib/utils";
import { uniqueSlug } from "@/lib/slug";
import { STEP } from "@/lib/order";

export const GET = route(async () => {
  const user = await requireUser();
  return listBoards(user.id);
});

const Create = z.object({
  title: z.string().trim().min(1).max(120),
  visibility: z.enum(["private", "public"]).default("private"),
  background: BackgroundInput.nullish(),
  starter: z.boolean().default(true),
});

export const POST = route(async (req) => {
  const user = await requireUser();
  const body = Create.parse(await req.json());

  const board = await db.transaction(async (tx) => {
    const [b] = await tx
      .insert(boards)
      .values({
        title: body.title,
        slug: await uniqueSlug(body.title),
        ownerId: user.id,
        visibility: body.visibility,
        background: body.background ?? { kind: "color", value: "#101113" },
      })
      .returning();

    await tx.insert(boardMembers).values({ boardId: b.id, userId: user.id, role: "owner" });
    await tx
      .insert(labels)
      .values(LABEL_COLORS.map((c, i) => ({ boardId: b.id, color: c.hex, name: c.name, position: i * STEP })));
    if (body.starter)
      await tx.insert(lists).values(
        ["Backlog", "In progress", "Done"].map((title, i) => ({
          boardId: b.id,
          title,
          position: (i + 1) * STEP,
        })),
      );
    return b;
  });

  return { id: board.id, slug: board.slug };
});
