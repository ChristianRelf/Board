import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { join } from "node:path";
import { lookup } from "node:dns";
import { requireView } from "@/lib/auth-helpers";
import { UPLOAD_DIR } from "@/lib/storage";
import type { Ctx } from "@/lib/route";

export const runtime = "nodejs";
void lookup; // keeps node builtin resolution honest in standalone output

/** Attachments are private to the board they live on. */
export async function GET(
  _req: Request,
  { params }: Ctx<{ board: string; name: string }>,
) {
  const { board, name } = await params;
  if (!/^[\w-]+$/.test(board) || !/^[\w.-]+$/.test(name) || name.includes(".."))
    return new Response("bad path", { status: 400 });

  try {
    await requireView(board);
  } catch {
    return new Response("forbidden", { status: 403 });
  }

  const path = join(UPLOAD_DIR, board, name);
  const info = await stat(path).catch(() => null);
  if (!info?.isFile()) return new Response("not found", { status: 404 });

  const stream = createReadStream(path) as unknown as ReadableStream;
  return new Response(stream, {
    headers: {
      "content-length": String(info.size),
      "cache-control": "private, max-age=31536000, immutable",
    },
  });
}
