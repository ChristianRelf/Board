import { and, eq } from "drizzle-orm";
import { db, boardMembers, boards } from "@/lib/db";
import { requireView } from "@/lib/auth-helpers";
import { subscribe, peers, type Envelope } from "@/lib/events";
import type { Ctx } from "@/lib/route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Server-sent events: one connection per open board tab. */
export async function GET(req: Request, { params }: Ctx<{ id: string }>) {
  const { id } = await params;
  let access;
  try {
    access = await requireView(id);
  } catch {
    return new Response("forbidden", { status: 403 });
  }

  const userId = access.user?.id;
  let privateBoard = access.board!.visibility === "private";
  const membership = userId
    ? await db
        .select({ id: boardMembers.userId })
        .from(boardMembers)
        .where(
          and(eq(boardMembers.boardId, id), eq(boardMembers.userId, userId)),
        )
        .limit(1)
    : [];
  let member = access.role === "owner" || membership.length > 0;
  const owner = access.board!.ownerId === userId;
  const enc = new TextEncoder();
  let unsub: (() => void) | undefined;
  let beat: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    async start(ctrl) {
      const send = (e: Envelope | { ev: unknown }) => {
        try {
          ctrl.enqueue(enc.encode(`data: ${JSON.stringify(e)}\n\n`));
        } catch {
          /* closed */
        }
      };
      send({ ev: { t: "presence", peers: peers(id) } });
      let delivery = Promise.resolve();
      let closed = false;
      const close = () => {
        closed = true;
        unsub?.();
        clearInterval(beat);
        try {
          ctrl.close();
        } catch {
          /* closed */
        }
      };
      unsub = await subscribe(id, (e) => {
        // Preserve event order while a reload checks access after a large event.
        delivery = delivery
          .then(async () => {
            if (closed) return;
            if (e.ev.t === "reload") {
              const [board] = await db
                .select({ visibility: boards.visibility })
                .from(boards)
                .where(eq(boards.id, id));
              if (!board) {
                send({ ev: { t: "reload" } });
                close();
                return;
              }
              privateBoard = board.visibility === "private";
              const membership = userId
                ? await db
                    .select({ id: boardMembers.userId })
                    .from(boardMembers)
                    .where(
                      and(
                        eq(boardMembers.boardId, id),
                        eq(boardMembers.userId, userId),
                      ),
                    )
                    .limit(1)
                : [];
              member = owner || membership.length > 0;
            }
            if (e.ev.t === "members")
              member =
                owner ||
                (e.ev.members as { id: string }[]).some((m) => m.id === userId);
            if (e.ev.t === "board")
              privateBoard =
                (e.ev.board as { visibility: string }).visibility === "private";
            if (privateBoard && !member) {
              send({ ev: { t: "reload" } });
              close();
              return;
            }
            send(e);
          })
          .catch(close);
      });
      // keep proxies from idling the connection out
      beat = setInterval(() => {
        try {
          ctrl.enqueue(enc.encode(": ping\n\n"));
        } catch {
          /* closed */
        }
      }, 20_000);
      req.signal.addEventListener("abort", () => {
        unsub?.();
        clearInterval(beat);
        try {
          ctrl.close();
        } catch {
          /* already closed */
        }
      });
    },
    cancel() {
      unsub?.();
      clearInterval(beat);
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}
