import { requireView } from "@/lib/auth-helpers";
import { subscribe, peers, type Envelope } from "@/lib/events";
import type { Ctx } from "@/lib/route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Server-sent events: one connection per open board tab. */
export async function GET(req: Request, { params }: Ctx<{ id: string }>) {
  const { id } = await params;
  try {
    await requireView(id);
  } catch {
    return new Response("forbidden", { status: 403 });
  }

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
      unsub = await subscribe(id, send);
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
