import "server-only";
import { Client } from "pg";
import { pool } from "./db";

/**
 * Realtime fan-out. Mutations call `publish()`, which writes a Postgres
 * NOTIFY; every app instance holds one LISTEN connection and pushes the
 * payload into the SSE streams subscribed to that board. No extra service.
 */

export type BoardEvent =
  | { t: "board"; board: unknown }
  | { t: "list.upsert"; list: unknown }
  | { t: "list.remove"; id: string }
  | { t: "card.upsert"; card: unknown }
  | { t: "card.remove"; id: string }
  | { t: "card.detail"; card: unknown }
  | { t: "label.upsert"; label: unknown }
  | { t: "label.remove"; id: string }
  | { t: "members"; members: unknown }
  | { t: "presence"; peers: Peer[] }
  | { t: "cursor"; peer: string; x: number; y: number }
  | { t: "reload" };

export type Envelope = { boardId: string; origin?: string; ev: BoardEvent };

type Sub = (e: Envelope) => void;

const CHANNEL = "board_events";

const g = globalThis as unknown as {
  __subs?: Map<string, Set<Sub>>;
  __listener?: Promise<Client>;
  __presence?: Map<string, Map<string, Peer & { seen: number }>>;
};

const subs: Map<string, Set<Sub>> = (g.__subs ??= new Map());
const presence: Map<string, Map<string, Peer & { seen: number }>> = (g.__presence ??=
  new Map());

async function listener() {
  g.__listener ??= (async () => {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    await client.query(`LISTEN ${CHANNEL}`);
    client.on("notification", (msg) => {
      if (!msg.payload) return;
      let env: Envelope;
      try {
        env = JSON.parse(msg.payload);
      } catch {
        return;
      }
      subs.get(env.boardId)?.forEach((fn) => {
        try {
          fn(env);
        } catch {
          /* dead stream, cleaned up on cancel */
        }
      });
    });
    client.on("error", () => {
      g.__listener = undefined;
    });
    return client;
  })();
  return g.__listener;
}

export async function subscribe(boardId: string, fn: Sub) {
  await listener();
  let set = subs.get(boardId);
  if (!set) subs.set(boardId, (set = new Set()));
  set.add(fn);
  return () => {
    set!.delete(fn);
    if (set!.size === 0) subs.delete(boardId);
  };
}

export async function publish(boardId: string, ev: BoardEvent, origin?: string) {
  const env: Envelope = { boardId, origin, ev };
  let payload = JSON.stringify(env);
  if (Buffer.byteLength(payload) > 7500) payload = JSON.stringify({ boardId, origin, ev: { t: "reload" } });
  await pool.query("SELECT pg_notify($1, $2)", [CHANNEL, payload]);
}

/* ─────────────────────────── presence ─────────────────────────── */

export type Peer = {
  id: string;
  name: string | null;
  image: string | null;
  color: string;
};

const PRESENCE_TTL = 25_000;

const PEER_COLORS = [
  "#5b8def",
  "#e8734a",
  "#38b2ac",
  "#a855f7",
  "#e0b341",
  "#ec4899",
  "#22c55e",
];

export function colorFor(userId: string) {
  let h = 0;
  for (const ch of userId) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return PEER_COLORS[Math.abs(h) % PEER_COLORS.length];
}

export async function heartbeat(boardId: string, peer: Peer) {
  let room = presence.get(boardId);
  if (!room) presence.set(boardId, (room = new Map()));
  const known = room.has(peer.id);
  room.set(peer.id, { ...peer, seen: Date.now() });
  prune(room);
  if (!known) await publish(boardId, { t: "presence", peers: peers(boardId) });
  return peers(boardId);
}

export async function leave(boardId: string, peerId: string) {
  const room = presence.get(boardId);
  if (!room?.delete(peerId)) return;
  await publish(boardId, { t: "presence", peers: peers(boardId) });
}

function prune(room: Map<string, Peer & { seen: number }>) {
  const cutoff = Date.now() - PRESENCE_TTL;
  for (const [k, v] of room) if (v.seen < cutoff) room.delete(k);
}

export function peers(boardId: string): Peer[] {
  const room = presence.get(boardId);
  if (!room) return [];
  prune(room);
  return [...room.values()].map(({ seen: _seen, ...p }) => p);
}
