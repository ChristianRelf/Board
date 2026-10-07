import "server-only";
import { and, asc, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import {
  db,
  attachments,
  boardLinks,
  boardMembers,
  boards,
  cardLabels,
  cardMembers,
  cards,
  checkItems,
  comments,
  labels,
  lists,
  users,
} from "@/lib/db";
import { HttpError } from "./auth-helpers";
import type { BoardSnapshot, CardDetail, CardT, BoardRef } from "./types";

const boardRefCols = {
  id: boards.id,
  title: boards.title,
  slug: boards.slug,
  visibility: boards.visibility,
  background: boards.background,
};

/** Row-level card fetch used by the write routes for authorisation. */
export async function loadCard(id: string) {
  const [card] = await db.select().from(cards).where(eq(cards.id, id));
  if (!card) throw new HttpError(404, "Card not found");
  return card;
}

export async function boardIdFromSlug(slug: string) {
  const [b] = await db.select({ id: boards.id }).from(boards).where(eq(boards.slug, slug));
  return b?.id ?? null;
}

/** Everything the board view needs, in five queries. */
export async function getSnapshot(
  boardId: string,
  role: BoardSnapshot["role"],
): Promise<BoardSnapshot | null> {
  const [board] = await db.select().from(boards).where(eq(boards.id, boardId));
  if (!board) return null;

  const [listRows, cardRows, labelRows, memberRows, links] = await Promise.all([
    db
      .select()
      .from(lists)
      .where(and(eq(lists.boardId, boardId), isNull(lists.archivedAt)))
      .orderBy(asc(lists.position)),
    cardsForBoard(boardId),
    db.select().from(labels).where(eq(labels.boardId, boardId)).orderBy(asc(labels.position)),
    db
      .select({
        id: users.id,
        name: users.name,
        image: users.image,
        role: boardMembers.role,
      })
      .from(boardMembers)
      .innerJoin(users, eq(users.id, boardMembers.userId))
      .where(eq(boardMembers.boardId, boardId)),
    db
      .select(boardRefCols)
      .from(boardLinks)
      .innerJoin(boards, eq(boards.id, boardLinks.toBoardId))
      .where(eq(boardLinks.fromBoardId, boardId)),
  ]);

  return {
    board: {
      id: board.id,
      title: board.title,
      slug: board.slug,
      description: board.description,
      visibility: board.visibility,
      background: board.background ?? null,
      starred: board.starred,
      ownerId: board.ownerId,
    },
    role,
    lists: listRows.map((l) => ({
      id: l.id,
      title: l.title,
      position: l.position,
      collapsed: l.collapsed,
    })),
    cards: cardRows,
    labels: labelRows.map((l) => ({ id: l.id, name: l.name, color: l.color, position: l.position })),
    members: memberRows as BoardSnapshot["members"],
    linkedBoards: links as BoardRef[],
  };
}

// Independent indexed subqueries avoid a labels × comments × checks cross product.
const cardColumns = {
  card: cards,
  linked: boardRefCols,
  labelIds: sql<string[]>`ARRAY(SELECT label_id FROM card_label WHERE card_id = ${cards.id})`,
  memberIds: sql<string[]>`ARRAY(SELECT user_id FROM card_member WHERE card_id = ${cards.id})`,
  comments: sql<number>`(SELECT count(*) FROM comment WHERE card_id = ${cards.id})`,
  attachments: sql<number>`(SELECT count(*) FROM attachment WHERE card_id = ${cards.id})`,
  checkTotal: sql<number>`(SELECT count(*) FROM check_item WHERE card_id = ${cards.id})`,
  checkDone: sql<number>`(SELECT count(*) FROM check_item WHERE card_id = ${cards.id} AND done)`,
};

export async function cardsForBoard(boardId: string): Promise<CardT[]> {
  const rows = await db.select(cardColumns).from(cards)
    .leftJoin(boards, eq(boards.id, cards.linkedBoardId))
    .where(and(eq(cards.boardId, boardId), isNull(cards.archivedAt)))
    .orderBy(asc(cards.position));
  return rows.map(toCard);
}

export async function getCard(cardId: string): Promise<CardT | null> {
  const rows = await db.select(cardColumns).from(cards)
    .leftJoin(boards, eq(boards.id, cards.linkedBoardId)).where(eq(cards.id, cardId));
  return rows[0] ? toCard(rows[0]) : null;
}

export async function getCardDetail(cardId: string): Promise<CardDetail | null> {
  const [card, atts, coms, checks] = await Promise.all([
    getCard(cardId),
    db
      .select()
      .from(attachments)
      .where(eq(attachments.cardId, cardId))
      .orderBy(desc(attachments.createdAt)),
    db
      .select({
        id: comments.id,
        body: comments.body,
        createdAt: comments.createdAt,
        uid: users.id,
        name: users.name,
        image: users.image,
      })
      .from(comments)
      .leftJoin(users, eq(users.id, comments.userId))
      .where(eq(comments.cardId, cardId))
      .orderBy(desc(comments.createdAt)),
    db
      .select()
      .from(checkItems)
      .where(eq(checkItems.cardId, cardId))
      .orderBy(asc(checkItems.position)),
  ]);

  if (!card) return null;
  return {
    ...card,
    attachments: atts.map((a) => ({
      id: a.id,
      name: a.name,
      url: a.url,
      mime: a.mime,
      size: a.size,
      kind: a.kind,
      createdAt: a.createdAt.toISOString(),
    })),
    comments: coms.map((c) => ({
      id: c.id,
      body: c.body,
      createdAt: c.createdAt.toISOString(),
      user: c.uid ? { id: c.uid, name: c.name, image: c.image } : null,
    })),
    checkItems: checks.map((c) => ({
      id: c.id,
      text: c.text,
      done: c.done,
      position: c.position,
    })),
  };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function toCard(r: any): CardT {
  const c = r.card;
  return {
    id: c.id,
    listId: c.listId,
    title: c.title,
    position: c.position,
    description: c.description,
    startAt: c.startAt?.toISOString() ?? null,
    dueAt: c.dueAt?.toISOString() ?? null,
    dueDone: c.dueDone,
    cover: c.cover,
    linkedBoard: r.linked?.id ? (r.linked as BoardRef) : null,
    labelIds: r.labelIds ?? [],
    memberIds: r.memberIds ?? [],
    counts: {
      comments: Number(r.comments ?? 0),
      attachments: Number(r.attachments ?? 0),
      checkDone: Number(r.checkDone ?? 0),
      checkTotal: Number(r.checkTotal ?? 0),
    },
    createdAt: c.createdAt.toISOString(),
  };
}

/** Boards the user can see on the dashboard. */
export async function listBoards(userId: string) {
  const rows = await db
    .selectDistinct({
      id: boards.id,
      title: boards.title,
      slug: boards.slug,
      visibility: boards.visibility,
      background: boards.background,
      starred: boards.starred,
      ownerId: boards.ownerId,
      canManage: sql<boolean>`(${boards.ownerId} = ${userId} OR EXISTS (SELECT 1 FROM board_member m WHERE m.board_id = ${boards.id} AND m.user_id = ${userId} AND m.role IN ('owner', 'admin')))`,
      updatedAt: boards.updatedAt,
    })
    .from(boards)
    .leftJoin(boardMembers, eq(boardMembers.boardId, boards.id))
    .where(
      and(
        isNull(boards.archivedAt),
        or(eq(boards.ownerId, userId), eq(boardMembers.userId, userId)),
      ),
    )
    .orderBy(desc(boards.starred), desc(boards.updatedAt));

  if (!rows.length) return [];
  const counts = await db
    .select({
      boardId: cards.boardId,
      n: sql<number>`count(*)`,
    })
    .from(cards)
    .where(
      and(
        inArray(
          cards.boardId,
          rows.map((r) => r.id),
        ),
        isNull(cards.archivedAt),
      ),
    )
    .groupBy(cards.boardId);

  const byId = new Map(counts.map((c) => [c.boardId, Number(c.n)]));
  return rows.map((r) => ({
    ...r,
    background: r.background ?? null,
    updatedAt: r.updatedAt.toISOString(),
    cardCount: byId.get(r.id) ?? 0,
  }));
}
