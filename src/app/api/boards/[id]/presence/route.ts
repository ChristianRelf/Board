import { z } from "zod";
import { requireView } from "@/lib/auth-helpers";
import { route, origin, type Ctx } from "@/lib/route";
import { colorFor, heartbeat, leave, publish } from "@/lib/events";

type P = { id: string };

const Body = z.object({
  cursor: z.object({ x: z.number(), y: z.number() }).nullish(),
});

export const POST = route<P, unknown>(async (req, { params }: Ctx<P>) => {
  const { id } = await params;
  const { user } = await requireView(id);
  if (!user) return { peers: [] };
  const body = Body.parse(await req.json().catch(() => ({})));

  const peerList = await heartbeat(id, {
    id: user.id,
    name: user.name ?? null,
    image: user.image ?? null,
    color: colorFor(user.id),
  });

  if (body.cursor)
    await publish(id, { t: "cursor", peer: user.id, ...body.cursor }, origin(req));

  return { peers: peerList };
});

export const DELETE = route<P, unknown>(async (_req, { params }: Ctx<P>) => {
  const { id } = await params;
  const { user } = await requireView(id);
  if (user) await leave(id, user.id);
  return { ok: true };
});
