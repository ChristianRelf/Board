import type { Background } from "./db/schema";

export type { Background };

export type Member = {
  id: string;
  name: string | null;
  image: string | null;
  role: "owner" | "admin" | "editor" | "viewer";
};

export type Label = { id: string; name: string | null; color: string; position: number };

export type ListT = {
  id: string;
  title: string;
  position: number;
  collapsed: boolean;
};

export type BoardRef = {
  id: string;
  title: string;
  slug: string;
  visibility: "private" | "public";
  background: Background | null;
};

export type CardT = {
  id: string;
  listId: string;
  title: string;
  position: number;
  description: string | null;
  startAt: string | null;
  dueAt: string | null;
  dueDone: boolean;
  cover: string | null;
  linkedBoard: BoardRef | null;
  labelIds: string[];
  memberIds: string[];
  counts: {
    comments: number;
    attachments: number;
    checkDone: number;
    checkTotal: number;
  };
  createdAt: string;
};

export type CardDetail = CardT & {
  attachments: Attachment[];
  comments: CommentT[];
  checkItems: CheckItem[];
};

export type Attachment = {
  id: string;
  name: string;
  url: string;
  mime: string | null;
  size: number | null;
  kind: "file" | "link";
  createdAt: string;
};

export type CommentT = {
  id: string;
  body: string;
  createdAt: string;
  user: { id: string; name: string | null; image: string | null } | null;
};

export type CheckItem = { id: string; text: string; done: boolean; position: number };

export type BoardSnapshot = {
  board: {
    id: string;
    title: string;
    slug: string;
    description: string | null;
    visibility: "private" | "public";
    background: Background | null;
    starred: boolean;
    ownerId: string;
  };
  role: "owner" | "admin" | "editor" | "viewer";
  lists: ListT[];
  cards: CardT[];
  labels: Label[];
  members: Member[];
  linkedBoards: BoardRef[];
};
