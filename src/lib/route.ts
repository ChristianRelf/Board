import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { HttpError } from "./auth-helpers";
import { db, activity } from "./db";

export type Ctx<P = Record<string, string>> = { params: Promise<P> };

export function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

/** Wraps a route handler so thrown HttpError/ZodError become clean responses. */
export function route<P, R>(
  fn: (req: Request, ctx: Ctx<P>) => Promise<R>,
): (req: Request, ctx: Ctx<P>) => Promise<Response> {
  return async (req, ctx) => {
    try {
      const out = await fn(req, ctx);
      return out instanceof Response ? out : NextResponse.json(out ?? { ok: true });
    } catch (e) {
      if (e instanceof HttpError)
        return NextResponse.json({ error: e.message }, { status: e.status });
      if (e instanceof ZodError)
        return NextResponse.json(
          { error: e.issues[0]?.message ?? "Invalid request" },
          { status: 422 },
        );
      console.error("[api]", e);
      return NextResponse.json({ error: "Something broke on our end" }, { status: 500 });
    }
  };
}

export const origin = (req: Request) => req.headers.get("x-client-id") ?? undefined;

export async function log(
  boardId: string,
  userId: string | null,
  type: string,
  data?: Record<string, unknown>,
  cardId?: string | null,
) {
  await db.insert(activity).values({ boardId, userId, type, data, cardId: cardId ?? null });
}
