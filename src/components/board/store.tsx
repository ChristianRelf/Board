"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { api, bg, CLIENT_ID, newId } from "@/lib/client";
import { positionAt } from "@/lib/order";
import type {
  BoardSnapshot,
  CardDetail,
  CardT,
  CheckItem,
  BoardRef,
  Label,
  ListT,
  Member,
} from "@/lib/types";

export type Peer = { id: string; name: string | null; image: string | null; color: string };

export type Filter = {
  q: string;
  labelIds: string[];
  memberIds: string[];
  due: "any" | "overdue" | "week" | "none";
};

type State = BoardSnapshot & {
  detail: Record<string, CardDetail>;
  peers: Peer[];
  filter: Filter;
  openCardId: string | null;
  connected: boolean;
  latency: number | null;
  lastChecked: number | null;
  pendingChecks: Record<string, CheckItem[]>;
  pendingCards: string[];
};

type Action =
  | { type: "card.pending"; card: CardT }
  | { type: "card.settled"; id: string }
  | { type: "links"; links: BoardRef[] }
  | { type: "check.pending"; cardId: string; item: CheckItem }
  | { type: "check.settled"; cardId: string; id: string }
  | { type: "snapshot"; snapshot: BoardSnapshot }
  | { type: "board"; board: Partial<State["board"]> }
  | { type: "list.upsert"; list: ListT }
  | { type: "list.remove"; id: string }
  | { type: "card.upsert"; card: CardT }
  | { type: "card.remove"; id: string }
  | { type: "card.detail"; card: CardDetail }
  | { type: "label.upsert"; label: Label }
  | { type: "label.remove"; id: string }
  | { type: "members"; members: Member[] }
  | { type: "peers"; peers: Peer[] }
  | { type: "filter"; filter: Partial<Filter> }
  | { type: "open"; id: string | null }
  | { type: "connected"; value: boolean }
  | { type: "latency"; value: number | null };

const emptyFilter: Filter = { q: "", labelIds: [], memberIds: [], due: "any" };

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "card.pending":
      return { ...s, cards: upsert(s.cards, a.card).sort(byPos), pendingCards: [...s.pendingCards, a.card.id] };
    case "card.settled":
      return { ...s, pendingCards: s.pendingCards.filter(id => id !== a.id) };
    case "links":
      return { ...s, linkedBoards: a.links };
    case "check.pending":
      return { ...s, pendingChecks: { ...s.pendingChecks, [a.cardId]: [...(s.pendingChecks[a.cardId] ?? []), a.item] } };
    case "check.settled":
      return { ...s, pendingChecks: { ...s.pendingChecks, [a.cardId]: (s.pendingChecks[a.cardId] ?? []).filter(i => i.id !== a.id) } };
    case "snapshot":
      return { ...s, ...a.snapshot, detail: {} };
    case "board":
      return { ...s, board: { ...s.board, ...a.board } };
    case "list.upsert":
      return { ...s, lists: upsert(s.lists, a.list).sort(byPos) };
    case "list.remove":
      return {
        ...s,
        lists: s.lists.filter((l) => l.id !== a.id),
        cards: s.cards.filter((c) => c.listId !== a.id),
      };
    case "card.upsert":
      return { ...s, cards: upsert(s.cards, a.card).sort(byPos) };
    case "card.remove":
      return { ...s, cards: s.cards.filter((c) => c.id !== a.id) };
    case "card.detail":
      return {
        ...s,
        detail: { ...s.detail, [a.card.id]: a.card },
        cards: upsert(s.cards, stripDetail(a.card)).sort(byPos),
      };
    case "label.upsert":
      return { ...s, labels: upsert(s.labels, a.label).sort(byPos) };
    case "label.remove":
      return {
        ...s,
        labels: s.labels.filter((l) => l.id !== a.id),
        cards: s.cards.map((c) => ({
          ...c,
          labelIds: c.labelIds.filter((id) => id !== a.id),
        })),
      };
    case "members":
      return { ...s, members: a.members };
    case "peers":
      return { ...s, peers: a.peers };
    case "filter":
      return { ...s, filter: { ...s.filter, ...a.filter } };
    case "open":
      return { ...s, openCardId: a.id };
    case "latency":
      return { ...s, latency: a.value, lastChecked: Date.now() };
    case "connected":
      return { ...s, connected: a.value };
  }
}

function stripDetail(c: CardDetail): CardT {
  const { attachments: _a, comments: _c, checkItems: _k, ...rest } = c;
  return rest;
}

const byPos = (a: { position: number }, b: { position: number }) => a.position - b.position;

function upsert<T extends { id: string }>(arr: T[], item: T) {
  const i = arr.findIndex((x) => x.id === item.id);
  if (i === -1) return [...arr, item];
  const next = arr.slice();
  next[i] = { ...next[i], ...item };
  return next;
}

/* ─────────────────────────── context ─────────────────────────── */

type Store = ReturnType<typeof useStoreValue>;
const Ctx = createContext<Store | null>(null);

export function useBoard() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useBoard outside BoardProvider");
  return ctx;
}

function useStoreValue(snapshot: BoardSnapshot, live: boolean) {
  const [state, dispatch] = useReducer(reducer, {
    ...snapshot,
    detail: {},
    peers: [],
    filter: emptyFilter,
    openCardId: null,
    connected: false,
    latency: 0,
    lastChecked: null,
    pendingChecks: {},
    pendingCards: [],
  } satisfies State);

  const boardId = state.board.id;
  const canManage = state.role === "owner" || state.role === "admin";
  const canEdit = live && (canManage || state.role === "editor");
  const [labelsExpanded, setLabelsExpanded] = useState(false);
  const detailRequests = useRef(new Map<string, Promise<CardDetail>>());
  const detailLoadedAt = useRef(new Map<string, number>());
  const checkQueues = useRef(new Map<string, Promise<unknown>>());
  useEffect(() => {
    setLabelsExpanded(document.cookie.split("; ").includes("board-labels-expanded=true"));
  }, []);
  const stateRef = useRef(state);
  stateRef.current = state;

  const refresh = useCallback(async () => {
    detailLoadedAt.current.clear();
    const fresh = await api.get<BoardSnapshot>(`/api/boards/${boardId}`);
    dispatch({ type: "snapshot", snapshot: fresh });
  }, [boardId]);

  /* realtime */
  useEffect(() => {
    if (!live) return;
    const es = new EventSource(`/api/boards/${boardId}/stream`);
    let opened = false;
    es.onopen = () => {
      dispatch({ type: "connected", value: true });
      if (opened) void refresh().catch(() => {});
      opened = true;
    };
    es.onerror = () => dispatch({ type: "connected", value: false });
    es.onmessage = (m) => {
      const { ev, origin } = JSON.parse(m.data) as {
        ev: { t: string } & Record<string, unknown>;
        origin?: string;
      };
      if (origin && origin === CLIENT_ID && ev.t !== "presence") return;
      switch (ev.t) {
        case "board":
          return dispatch({ type: "board", board: ev.board as State["board"] });
        case "list.upsert":
          return dispatch({ type: "list.upsert", list: ev.list as ListT });
        case "list.remove":
          return dispatch({ type: "list.remove", id: ev.id as string });
        case "card.upsert":
          return dispatch({ type: "card.upsert", card: ev.card as CardT });
        case "card.remove":
          return dispatch({ type: "card.remove", id: ev.id as string });
        case "card.detail":
          return dispatch({ type: "card.detail", card: ev.card as CardDetail });
        case "label.upsert":
          return dispatch({ type: "label.upsert", label: ev.label as Label });
        case "label.remove":
          return dispatch({ type: "label.remove", id: ev.id as string });
        case "members":
          void refresh().catch(() => { window.location.href = "/"; });
          return dispatch({ type: "members", members: ev.members as Member[] });
        case "presence":
          return dispatch({ type: "peers", peers: ev.peers as Peer[] });
        case "reload":
          void refresh().then(() => {
            const id = stateRef.current.openCardId;
            if (id) void actionsRef.current?.loadDetail(id, true);
          }).catch(() => { window.location.href = "/"; });
      }
    };
    return () => es.close();
  }, [boardId, live, refresh]);

  /* presence heartbeat */
  useEffect(() => {
    if (!live) return;
    let stopped = false;
    const ping = () => {
      const started = performance.now();
      return api
        .post<{ peers: Peer[] }>(`/api/boards/${boardId}/presence`, {})
        .then((r) => { if (!stopped) { dispatch({ type: "peers", peers: r.peers }); dispatch({ type: "latency", value: performance.now() - started }); } })
        .catch(() => { if (!stopped) dispatch({ type: "latency", value: null }); });
    };
    ping();
    const t = setInterval(ping, 12_000);
    const bye = () => void api.del(`/api/boards/${boardId}/presence`).catch(() => {});
    window.addEventListener("pagehide", bye);
    return () => {
      stopped = true;
      clearInterval(t);
      window.removeEventListener("pagehide", bye);
      void api.del(`/api/boards/${boardId}/presence`).catch(() => {});
    };
  }, [boardId, live]);

  /* ───────── derived ───────── */

  const cardsByList = useMemo(() => {
    const map = new Map<string, CardT[]>();
    for (const l of state.lists) map.set(l.id, []);
    for (const c of state.cards) map.get(c.listId)?.push(c);
    for (const arr of map.values()) arr.sort(byPos);
    return map;
  }, [state.lists, state.cards]);

  const matches = useMemo(() => {
    const f = state.filter;
    const active =
      !!f.q || f.labelIds.length > 0 || f.memberIds.length > 0 || f.due !== "any";
    const now = Date.now();
    const week = now + 7 * 864e5;
    const test = (c: CardT) => {
      if (f.q && !c.title.toLowerCase().includes(f.q.toLowerCase())) return false;
      if (f.labelIds.length && !f.labelIds.some((id) => c.labelIds.includes(id))) return false;
      if (f.memberIds.length && !f.memberIds.some((id) => c.memberIds.includes(id)))
        return false;
      if (f.due === "none" && c.dueAt) return false;
      if (f.due === "overdue" && (!c.dueAt || Date.parse(c.dueAt) > now || c.dueDone))
        return false;
      if (f.due === "week" && (!c.dueAt || Date.parse(c.dueAt) > week)) return false;
      return true;
    };
    return { active, test };
  }, [state.filter]);

  /* ───────── mutations (optimistic, then reconciled by SSE) ───────── */

  const actions = useMemo(() => {
    const guard = () => {
      if (!canEdit) throw new Error("read only");
    };

    const manage = () => { if (!canManage) throw new Error("Admin access required"); };
    return {
      refresh,
      toggleLabelsExpanded() {
        setLabelsExpanded(prev => {
          const next = !prev;
          document.cookie = `board-labels-expanded=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
          return next;
        });
      },
      open: (id: string | null) => dispatch({ type: "open", id }),
      setFilter: (filter: Partial<Filter>) => dispatch({ type: "filter", filter }),
      clearFilter: () => dispatch({ type: "filter", filter: emptyFilter }),

      async addList(title: string) {
        manage();
        const list = await bg(api.post<ListT>("/api/lists", { boardId, title }));
        dispatch({ type: "list.upsert", list });
        return list;
      },

      renameList(id: string, title: string) {
        manage();
        const prev = stateRef.current.lists.find((l) => l.id === id);
        dispatch({ type: "list.upsert", list: { ...prev!, title } });
        bg(api.patch(`/api/lists/${id}`, { title }), refresh);
      },

      toggleListCollapsed(id: string) {
        manage();
        const prev = stateRef.current.lists.find((l) => l.id === id)!;
        dispatch({ type: "list.upsert", list: { ...prev, collapsed: !prev.collapsed } });
        bg(api.patch(`/api/lists/${id}`, { collapsed: !prev.collapsed }), refresh);
      },

      removeList(id: string) {
        manage();
        dispatch({ type: "list.remove", id });
        bg(api.del(`/api/lists/${id}`), refresh);
      },

      moveList(id: string, index: number) {
        manage();
        const others = stateRef.current.lists.filter((l) => l.id !== id);
        const position = positionAt(others, index);
        const list = stateRef.current.lists.find((l) => l.id === id)!;
        dispatch({ type: "list.upsert", list: { ...list, position } });
        bg(api.patch(`/api/lists/${id}`, { position }), refresh);
      },

      async addCard(listId: string, title: string, linkedBoardId?: string) {
        guard();
        const id = newId();
        const existing = stateRef.current.cards.filter(c => c.listId === listId);
        dispatch({ type: "card.pending", card: {
          id, listId, title, position: Math.max(0, ...existing.map(c => c.position)) + 1024,
          description: null, startAt: null, dueAt: null, dueDone: false, cover: null,
          linkedBoard: stateRef.current.linkedBoards.find(b => b.id === linkedBoardId) ?? null,
          labelIds: [], memberIds: [], counts: { comments: 0, attachments: 0, checkDone: 0, checkTotal: 0 },
          createdAt: new Date().toISOString(),
        } });
        try {
          const card = await bg(api.post<CardT>("/api/cards", { cardId: id, listId, title, linkedBoardId }));
          dispatch({ type: "card.upsert", card });
          return card;
        } catch {
          dispatch({ type: "card.remove", id });
        } finally {
          dispatch({ type: "card.settled", id });
        }
      },

      moveCard(id: string, listId: string, index: number) {
        guard();
        const target = (cardsByList.get(listId) ?? []).filter((c) => c.id !== id);
        const position = positionAt(target, index);
        const card = stateRef.current.cards.find((c) => c.id === id)!;
        dispatch({ type: "card.upsert", card: { ...card, listId, position } });
        bg(api.patch(`/api/cards/${id}`, { listId, position }), refresh);
      },

      patchCard(id: string, patch: Partial<CardT> & { archived?: boolean }) {
        guard();
        const card = stateRef.current.cards.find((c) => c.id === id);
        if (card && !patch.archived)
          dispatch({ type: "card.upsert", card: { ...card, ...patch } as CardT });
        if (patch.archived) dispatch({ type: "card.remove", id });
        bg(api.patch(`/api/cards/${id}`, patch), refresh);
      },

      setLinkedBoard(cardId: string, board: CardT["linkedBoard"]) {
        guard();
        const card = stateRef.current.cards.find((c) => c.id === cardId)!;
        dispatch({ type: "card.upsert", card: { ...card, linkedBoard: board } });
        bg(
          api.patch(`/api/cards/${cardId}`, { linkedBoardId: board?.id ?? null }),
          refresh,
        );
      },

      removeCard(id: string) {
        guard();
        dispatch({ type: "card.remove", id });
        bg(api.del(`/api/cards/${id}`), refresh);
      },

      toggleLabel(cardId: string, labelId: string) {
        guard();
        const card = stateRef.current.cards.find((c) => c.id === cardId)!;
        const on = !card.labelIds.includes(labelId);
        dispatch({
          type: "card.upsert",
          card: {
            ...card,
            labelIds: on
              ? [...card.labelIds, labelId]
              : card.labelIds.filter((l) => l !== labelId),
          },
        });
        bg(api.post(`/api/cards/${cardId}/labels`, { labelId, on }), refresh);
      },

      toggleMember(cardId: string, userId: string) {
        guard();
        const card = stateRef.current.cards.find((c) => c.id === cardId)!;
        const on = !card.memberIds.includes(userId);
        dispatch({
          type: "card.upsert",
          card: {
            ...card,
            memberIds: on
              ? [...card.memberIds, userId]
              : card.memberIds.filter((m) => m !== userId),
          },
        });
        bg(api.post(`/api/cards/${cardId}/members`, { userId, on }), refresh);
      },

      async createLabel(color: string, name?: string) {
        guard();
        const label = await bg(api.post<Label>("/api/labels", { boardId, color, name }));
        dispatch({ type: "label.upsert", label });
        return label;
      },

      reorderLabels(ids: string[]) {
        guard();
        const labels = stateRef.current.labels;
        ids.forEach((id, i) => {
          const label = labels.find(l => l.id === id);
          if (label) dispatch({ type: "label.upsert", label: { ...label, position: i * 1024 } });
        });
        bg(api.patch(`/api/boards/${boardId}/labels`, { ids }), refresh);
      },

      updateLabel(id: string, patch: { name?: string | null; color?: string; position?: number }) {
        guard();
        const prev = stateRef.current.labels.find((l) => l.id === id)!;
        dispatch({ type: "label.upsert", label: { ...prev, ...patch } });
        bg(api.patch(`/api/labels/${id}`, patch), refresh);
      },

      removeLabel(id: string) {
        guard();
        dispatch({ type: "label.remove", id });
        bg(api.del(`/api/labels/${id}`), refresh);
      },

      patchBoard(patch: Partial<State["board"]>) {
        manage();
        dispatch({ type: "board", board: patch });
        bg(api.patch(`/api/boards/${boardId}`, patch), refresh);
      },

      /* card detail ------------------------------------------------ */

      async loadDetail(cardId: string, force = false): Promise<CardDetail> {
        const cached = stateRef.current.detail[cardId];
        if (!force && cached && Date.now() - (detailLoadedAt.current.get(cardId) ?? 0) < 30_000) return cached;
        const pending = detailRequests.current.get(cardId);
        if (pending) return pending;
        const request = api.get<CardDetail>(`/api/cards/${cardId}`).then(card => {
          const current = stateRef.current.cards.find(c => c.id === cardId);
          dispatch({ type: "card.detail", card: { ...card, ...(current ?? {}), counts: card.counts } });
          detailLoadedAt.current.set(cardId, Date.now());
          return card;
        }).finally(() => detailRequests.current.delete(cardId));
        detailRequests.current.set(cardId, request);
        return request;
      },

      async addComment(cardId: string, body: string) {
        guard();
        const card = await bg(api.post<CardDetail>(`/api/cards/${cardId}/comments`, { body }));
        dispatch({ type: "card.detail", card });
      },

      async removeComment(cardId: string, id: string) {
        guard();
        await bg(api.del(`/api/comments/${id}`));
        void actionsRef.current?.loadDetail(cardId, true);
      },

      async addCheck(cardId: string, text: string) {
        guard();
        const id = newId();
        dispatch({ type: "check.pending", cardId, item: { id, text, done: false, position: Date.now() } });
        // Serialize creates per card so rapid Enter presses cannot overwrite each other.
        const previous = checkQueues.current.get(cardId) ?? Promise.resolve();
        const request = previous.catch(() => {}).then(async () => {
          const card = await bg(api.post<CardDetail>(`/api/cards/${cardId}/checks`, { text, itemId: id }));
          dispatch({ type: "card.detail", card });
        }).finally(() => dispatch({ type: "check.settled", cardId, id }));
        checkQueues.current.set(cardId, request);
        try { await request; } catch { /* bg reports the failed save and the pending item is removed */ }
        finally { if (checkQueues.current.get(cardId) === request) checkQueues.current.delete(cardId); }
      },

      async patchCheck(cardId: string, id: string, patch: { text?: string; done?: boolean }) {
        guard();
        const detail = stateRef.current.detail[cardId];
        if (detail)
          dispatch({
            type: "card.detail",
            card: {
              ...detail,
              ...stateRef.current.cards.find(c => c.id === cardId),
              counts: { ...detail.counts, checkDone: detail.checkItems.filter(i => (i.id === id ? patch.done ?? i.done : i.done)).length },
              checkItems: detail.checkItems.map((i) => (i.id === id ? { ...i, ...patch } : i)),
            },
          });
        const card = await bg(api.patch<CardDetail>(`/api/checks/${id}`, patch));
        dispatch({ type: "card.detail", card });
      },

      async removeCheck(cardId: string, id: string) {
        guard();
        await bg(api.del(`/api/checks/${id}`));
        void actionsRef.current?.loadDetail(cardId, true);
      },

      async upload(cardId: string, files: File[]) {
        guard();
        const form = new FormData();
        files.forEach((f) => form.append("file", f));
        const card = await bg(
          api.post<CardDetail>(`/api/cards/${cardId}/attachments`, form),
        );
        dispatch({ type: "card.detail", card });
        return card;
      },

      async attachLink(cardId: string, url: string, name?: string) {
        guard();
        const card = await bg(
          api.post<CardDetail>(`/api/cards/${cardId}/attachments`, { url, name }),
        );
        dispatch({ type: "card.detail", card });
      },

      async removeAttachment(cardId: string, id: string) {
        guard();
        await bg(api.del(`/api/attachments/${id}`));
        void actionsRef.current?.loadDetail(cardId, true);
      },

      async addMember(userId: string, role: "admin" | "editor" | "viewer" = "editor") {
        manage();
        const members = await bg(
          api.post<Member[]>(`/api/boards/${boardId}/members`, { userId, role }),
        );
        dispatch({ type: "members", members });
        await refresh().catch(() => { window.location.href = "/"; });
      },

      async removeMember(userId: string) {
        manage();
        const members = await bg(
          api.del<Member[]>(`/api/boards/${boardId}/members?userId=${userId}`),
        );
        dispatch({ type: "members", members });
        await refresh().catch(() => { window.location.href = "/"; });
      },

      async linkBoard(board: BoardRef) {
        manage();
        const prev = stateRef.current.linkedBoards;
        dispatch({ type: "links", links: upsert(prev, board) });
        try { await bg(api.post(`/api/boards/${boardId}/links`, { toBoardId: board.id })); }
        catch { dispatch({ type: "links", links: stateRef.current.linkedBoards.filter(b => b.id !== board.id) }); }
      },

      async unlinkBoard(toBoardId: string) {
        manage();
        const prev = stateRef.current.linkedBoards;
        dispatch({ type: "links", links: prev.filter(b => b.id !== toBoardId) });
        try { await bg(api.del(`/api/boards/${boardId}/links?toBoardId=${toBoardId}`)); }
        catch { await refresh(); }
      },
    };
  }, [boardId, canEdit, canManage, cardsByList, refresh]);

  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  return { ...state, canEdit, canManage: live && canManage, labelsExpanded, cardsByList, matches, ...actions };
}

export function BoardProvider({
  snapshot,
  live = true,
  children,
}: {
  snapshot: BoardSnapshot;
  live?: boolean;
  children: ReactNode;
}) {
  const value = useStoreValue(snapshot, live);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
