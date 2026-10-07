import { z } from "zod";
import { requireAdmin } from "@/lib/auth-helpers";
import { route, origin, log } from "@/lib/route";
import { createBackup, listBackups, restoreBackup } from "@/lib/backups";
import { publish } from "@/lib/events";

export const GET = route<{ id: string }, unknown>(async (_req, { params }) => {
  const { id } = await params;
  await requireAdmin(id);
  return listBackups(id);
});
export const POST = route<{ id: string }, unknown>(async (req, { params }) => {
  const { id } = await params;
  const { user } = await requireAdmin(id);
  const { name } = z
    .object({
      name: z.string().trim().min(1).max(100).default("Manual backup"),
    })
    .parse(await req.json());
  await createBackup(id, user.id, name);
  await log(id, user.id, "board.backup", { title: name });
  return listBackups(id);
});
export const PATCH = route<{ id: string }, unknown>(async (req, { params }) => {
  const { id } = await params;
  const { user } = await requireAdmin(id);
  const { backupId } = z
    .object({ backupId: z.string().uuid() })
    .parse(await req.json());
  await restoreBackup(id, backupId, user.id);
  await publish(id, { t: "reload" }, origin(req));
  return listBackups(id);
});
