import "server-only";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import {
  db,
  boards,
  boardBackups,
  lists,
  cards,
  labels,
  cardLabels,
  cardMembers,
  checkItems,
  attachments,
  comments,
  boardLinks,
  activity,
  users,
} from "./db";
import { HttpError } from "./auth-helpers";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function capture(tx: Tx, boardId: string) {
  const [board] = await tx.select().from(boards).where(eq(boards.id, boardId));
  const cardIds = tx
    .select({ id: cards.id })
    .from(cards)
    .where(eq(cards.boardId, boardId));
  return {
    board: {
      title: board.title,
      description: board.description,
      background: board.background,
    },
    lists: await tx.select().from(lists).where(eq(lists.boardId, boardId)),
    cards: await tx.select().from(cards).where(eq(cards.boardId, boardId)),
    labels: await tx.select().from(labels).where(eq(labels.boardId, boardId)),
    cardLabels: await tx
      .select()
      .from(cardLabels)
      .where(inArray(cardLabels.cardId, cardIds)),
    cardMembers: await tx
      .select()
      .from(cardMembers)
      .where(inArray(cardMembers.cardId, cardIds)),
    checks: await tx
      .select()
      .from(checkItems)
      .where(inArray(checkItems.cardId, cardIds)),
    attachments: await tx
      .select()
      .from(attachments)
      .where(inArray(attachments.cardId, cardIds)),
    comments: await tx
      .select()
      .from(comments)
      .where(inArray(comments.cardId, cardIds)),
    links: await tx
      .select()
      .from(boardLinks)
      .where(eq(boardLinks.fromBoardId, boardId)),
  };
}
type BackupData = Awaited<ReturnType<typeof capture>>;

export async function listBackups(boardId: string) {
  return db
    .select({
      id: boardBackups.id,
      name: boardBackups.name,
      createdAt: boardBackups.createdAt,
    })
    .from(boardBackups)
    .where(eq(boardBackups.boardId, boardId))
    .orderBy(desc(boardBackups.createdAt))
    .limit(50);
}

export async function createBackup(
  boardId: string,
  userId: string,
  name: string,
) {
  await db.transaction(
    async (tx) => {
      const data = await capture(tx, boardId);
      await tx
        .insert(boardBackups)
        .values({ boardId, createdBy: userId, name, data });
    },
    { isolationLevel: "repeatable read" },
  );
}

// Dates in JSON snapshots need to be revived before Drizzle serializes inserts.
function dates<T extends object>(row: T): T {
  return Object.fromEntries(
    Object.entries(row).map(([k, v]) => [
      k,
      k.endsWith("At") && typeof v === "string" ? new Date(v) : v,
    ]),
  ) as T;
}

export async function restoreBackup(
  boardId: string,
  backupId: string,
  userId: string,
) {
  await db.transaction(
    async (tx) => {
      await tx.execute(
        sql`SELECT id FROM board WHERE id = ${boardId} FOR UPDATE`,
      );
      const [backup] = await tx
        .select()
        .from(boardBackups)
        .where(
          and(eq(boardBackups.id, backupId), eq(boardBackups.boardId, boardId)),
        );
      if (!backup) throw new HttpError(404, "Backup not found");
      // Always preserve the current state, so a restore itself is reversible.
      await tx
        .insert(boardBackups)
        .values({
          boardId,
          createdBy: userId,
          name: "Before restore",
          data: await capture(tx, boardId),
        });
      const data = backup.data as BackupData;
      const userIds = new Set(
        (await tx.select({ id: users.id }).from(users)).map((u) => u.id),
      );
      const boardIds = new Set(
        (await tx.select({ id: boards.id }).from(boards)).map((b) => b.id),
      );
      await tx
        .update(activity)
        .set({ cardId: null })
        .where(eq(activity.boardId, boardId));
      await tx.delete(cards).where(eq(cards.boardId, boardId));
      await tx.delete(lists).where(eq(lists.boardId, boardId));
      await tx.delete(labels).where(eq(labels.boardId, boardId));
      await tx.delete(boardLinks).where(eq(boardLinks.fromBoardId, boardId));
      await tx
        .update(boards)
        .set({ ...data.board, updatedAt: new Date() })
        .where(eq(boards.id, boardId));
      if (data.lists.length)
        await tx.insert(lists).values(data.lists.map(dates));
      if (data.labels.length) await tx.insert(labels).values(data.labels);
      if (data.cards.length)
        await tx
          .insert(cards)
          .values(
            data.cards.map((c) =>
              dates({
                ...c,
                createdBy:
                  c.createdBy && userIds.has(c.createdBy) ? c.createdBy : null,
                linkedBoardId:
                  c.linkedBoardId && boardIds.has(c.linkedBoardId)
                    ? c.linkedBoardId
                    : null,
              }),
            ),
          );
      if (data.cardLabels.length)
        await tx.insert(cardLabels).values(data.cardLabels);
      const members = data.cardMembers.filter((m) => userIds.has(m.userId));
      if (members.length) await tx.insert(cardMembers).values(members);
      if (data.checks.length) await tx.insert(checkItems).values(data.checks);
      if (data.attachments.length)
        await tx
          .insert(attachments)
          .values(
            data.attachments.map((a) =>
              dates({
                ...a,
                uploadedBy:
                  a.uploadedBy && userIds.has(a.uploadedBy)
                    ? a.uploadedBy
                    : null,
              }),
            ),
          );
      if (data.comments.length)
        await tx
          .insert(comments)
          .values(
            data.comments.map((c) =>
              dates({
                ...c,
                userId: c.userId && userIds.has(c.userId) ? c.userId : null,
              }),
            ),
          );
      const links = data.links.filter((l) => boardIds.has(l.toBoardId));
      if (links.length) await tx.insert(boardLinks).values(links.map(dates));
      await tx
        .insert(activity)
        .values({
          boardId,
          userId,
          type: "board.restore",
          data: { title: backup.name },
        });
    },
    { isolationLevel: "serializable" },
  );
}
