import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  doublePrecision,
  primaryKey,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";
import { relations } from "drizzle-orm";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

/* ─────────────────────────── auth.js ─────────────────────────── */

export const users = pgTable("user", {
  id: id(),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  discordId: text("discord_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })],
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

/* ─────────────────────────── boards ─────────────────────────── */

export type Background = {
  /** solid | gradient-free image | subtle pattern */
  kind: "color" | "image";
  value: string;
  /** darken overlay 0-1, keeps text legible over photos */
  dim?: number;
};

export const boards = pgTable(
  "board",
  {
    id: id(),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    background: jsonb("background").$type<Background>(),
    visibility: text("visibility", { enum: ["private", "public"] })
      .notNull()
      .default("private"),
    description: text("description"),
    starred: boolean("starred").notNull().default(false),
    archivedAt: timestamp("archived_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("board_owner_idx").on(t.ownerId)],
);

export const boardMembers = pgTable(
  "board_member",
  {
    boardId: text("board_id")
      .notNull()
      .references(() => boards.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["owner", "editor", "viewer"] })
      .notNull()
      .default("editor"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.boardId, t.userId] })],
);

/** board ↔ board relationships, created by dragging one board onto another */
export const boardLinks = pgTable(
  "board_link",
  {
    id: id(),
    fromBoardId: text("from_board_id")
      .notNull()
      .references(() => boards.id, { onDelete: "cascade" }),
    toBoardId: text("to_board_id")
      .notNull()
      .references(() => boards.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("board_link_pair_idx").on(t.fromBoardId, t.toBoardId)],
);

export const lists = pgTable(
  "list",
  {
    id: id(),
    boardId: text("board_id")
      .notNull()
      .references(() => boards.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    position: doublePrecision("position").notNull(),
    collapsed: boolean("collapsed").notNull().default(false),
    archivedAt: timestamp("archived_at"),
  },
  (t) => [index("list_board_idx").on(t.boardId)],
);

export const cards = pgTable(
  "card",
  {
    id: id(),
    boardId: text("board_id")
      .notNull()
      .references(() => boards.id, { onDelete: "cascade" }),
    listId: text("list_id")
      .notNull()
      .references(() => lists.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    position: doublePrecision("position").notNull(),
    startAt: timestamp("start_at"),
    dueAt: timestamp("due_at"),
    dueDone: boolean("due_done").notNull().default(false),
    cover: text("cover"),
    /** a card can point at another board — the drag-and-drop board link */
    linkedBoardId: text("linked_board_id").references(() => boards.id, {
      onDelete: "set null",
    }),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    archivedAt: timestamp("archived_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("card_list_idx").on(t.listId), index("card_board_idx").on(t.boardId)],
);

export const labels = pgTable(
  "label",
  {
    id: id(),
    boardId: text("board_id")
      .notNull()
      .references(() => boards.id, { onDelete: "cascade" }),
    name: text("name"),
    color: text("color").notNull(),
  },
  (t) => [index("label_board_idx").on(t.boardId)],
);

export const cardLabels = pgTable(
  "card_label",
  {
    cardId: text("card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    labelId: text("label_id")
      .notNull()
      .references(() => labels.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.cardId, t.labelId] })],
);

export const cardMembers = pgTable(
  "card_member",
  {
    cardId: text("card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.cardId, t.userId] })],
);

export const checkItems = pgTable(
  "check_item",
  {
    id: id(),
    cardId: text("card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    done: boolean("done").notNull().default(false),
    position: doublePrecision("position").notNull(),
  },
  (t) => [index("check_card_idx").on(t.cardId)],
);

export const attachments = pgTable(
  "attachment",
  {
    id: id(),
    cardId: text("card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    url: text("url").notNull(),
    mime: text("mime"),
    size: integer("size"),
    /** file = stored by us, link = external url */
    kind: text("kind", { enum: ["file", "link"] })
      .notNull()
      .default("file"),
    uploadedBy: text("uploaded_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("attachment_card_idx").on(t.cardId)],
);

export const comments = pgTable(
  "comment",
  {
    id: id(),
    cardId: text("card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("comment_card_idx").on(t.cardId)],
);

export const activity = pgTable(
  "activity",
  {
    id: id(),
    boardId: text("board_id")
      .notNull()
      .references(() => boards.id, { onDelete: "cascade" }),
    cardId: text("card_id").references(() => cards.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    type: text("type").notNull(),
    data: jsonb("data").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("activity_board_idx").on(t.boardId, t.createdAt)],
);

/* ─────────────────────────── relations ─────────────────────────── */

export const boardRelations = relations(boards, ({ many, one }) => ({
  lists: many(lists),
  cards: many(cards),
  labels: many(labels),
  members: many(boardMembers),
  owner: one(users, { fields: [boards.ownerId], references: [users.id] }),
}));

export const listRelations = relations(lists, ({ many, one }) => ({
  cards: many(cards),
  board: one(boards, { fields: [lists.boardId], references: [boards.id] }),
}));

export const cardRelations = relations(cards, ({ many, one }) => ({
  list: one(lists, { fields: [cards.listId], references: [lists.id] }),
  labels: many(cardLabels),
  members: many(cardMembers),
  attachments: many(attachments),
  comments: many(comments),
  checkItems: many(checkItems),
}));

export const boardMemberRelations = relations(boardMembers, ({ one }) => ({
  user: one(users, { fields: [boardMembers.userId], references: [users.id] }),
  board: one(boards, { fields: [boardMembers.boardId], references: [boards.id] }),
}));

export const cardLabelRelations = relations(cardLabels, ({ one }) => ({
  label: one(labels, { fields: [cardLabels.labelId], references: [labels.id] }),
  card: one(cards, { fields: [cardLabels.cardId], references: [cards.id] }),
}));

export const cardMemberRelations = relations(cardMembers, ({ one }) => ({
  user: one(users, { fields: [cardMembers.userId], references: [users.id] }),
  card: one(cards, { fields: [cardMembers.cardId], references: [cards.id] }),
}));

export const attachmentRelations = relations(attachments, ({ one }) => ({
  card: one(cards, { fields: [attachments.cardId], references: [cards.id] }),
}));

export const commentRelations = relations(comments, ({ one }) => ({
  card: one(cards, { fields: [comments.cardId], references: [cards.id] }),
  user: one(users, { fields: [comments.userId], references: [users.id] }),
}));

export const checkItemRelations = relations(checkItems, ({ one }) => ({
  card: one(cards, { fields: [checkItems.cardId], references: [cards.id] }),
}));
