import "server-only";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import { join, extname, basename } from "node:path";
import { randomUUID } from "node:crypto";

export const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";
export const MAX_UPLOAD = 25 * 1024 * 1024;

/** Files are namespaced per board so the serve route can authorise by path. */
export async function saveUpload(boardId: string, file: File) {
  const dir = join(UPLOAD_DIR, boardId);
  await mkdir(dir, { recursive: true });
  const safe = basename(file.name).replace(/[^\w.\- ]/g, "_").slice(0, 80);
  const name = `${randomUUID()}${extname(safe) || ""}`;
  await writeFile(join(dir, name), Buffer.from(await file.arrayBuffer()));
  return { storedName: name, url: `/api/files/${boardId}/${name}`, displayName: safe };
}

export async function removeUpload(url: string) {
  const m = /^\/api\/files\/([\w-]+)\/([\w.-]+)$/.exec(url);
  if (!m) return;
  await unlink(join(UPLOAD_DIR, m[1], m[2])).catch(() => {});
}
