"use client";

import { useEffect, useState } from "react";
import { Activity, ArchiveRestore, Plus, RotateCcw } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { api } from "@/lib/client";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { HeaderButton } from "@/components/ui/HeaderAction";
import { Drawer } from "@/components/ui/Drawer";
import { Modal } from "@/components/ui/Modal";
import { useBoard } from "./store";

type Row = {
  id: string;
  type: string;
  data: Record<string, unknown> | null;
  createdAt: string;
  user: { id: string; name: string | null; image: string | null } | null;
};
type Backup = { id: string; name: string; createdAt: string };
const verbs: Record<string, string> = {
  "card.create": "added",
  "card.move": "moved",
  "card.archive": "archived",
  "card.delete": "deleted",
  comment: "commented on",
  "board.backup": "saved a backup",
  "board.restore": "restored",
};

export function ActivityDrawer() {
  const b = useBoard();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [backups, setBackups] = useState<Backup[] | null>(null);
  const [restore, setRestore] = useState<Backup | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  async function load() {
    setError(false);
    try {
      await Promise.all([
        api.get<Row[]>(`/api/boards/${b.board.id}/activity`).then(setRows),
        ...(b.canManage
          ? [
              api
                .get<Backup[]>(`/api/boards/${b.board.id}/backups`)
                .then(setBackups),
            ]
          : []),
      ]);
    } catch {
      setError(true);
    }
  }
  useEffect(() => {
    if (!open) return;
    void load();
    const t = setInterval(() => void load(), 15_000);
    return () => clearInterval(t);
  }, [open, b.board.id, b.canManage]);
  return (
    <>
      <HeaderButton
        icon={<Activity size={16} />}
        label="Recent activity"
        revealLabel="Activity"
        onClick={() => setOpen(true)}
      />
      <Drawer open={open} onOpenChange={setOpen} title="Activity & backups">
        {error && (
          <Button size="sm" onClick={() => void load()}>
            Couldn’t load updates · Retry
          </Button>
        )}
        <section>
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-faint">
            Recent activity
          </h3>
          <ul className="scroll-thin max-h-[48vh] space-y-4 overflow-y-auto pr-1">
            {rows?.map((r) => (
              <li key={r.id} className="flex gap-3">
                <Avatar user={r.user ?? { id: "?" }} size={28} />
                <p className="text-xs leading-relaxed text-muted">
                  <strong className="font-medium text-text">
                    {r.user?.name ?? "Someone"}
                  </strong>{" "}
                  {verbs[r.type] ?? r.type}{" "}
                  <span className="text-text">
                    {String(r.data?.title ?? "")}
                  </span>
                  <span className="block text-[10px] text-faint">
                    {formatDistanceToNow(new Date(r.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
                </p>
              </li>
            ))}
            {!rows && !error && (
              <li
                className="skeleton h-20 rounded-lg"
                aria-label="Loading activity"
              />
            )}
            {rows?.length === 0 && (
              <li className="text-sm text-faint">
                Your board’s story starts here.
              </li>
            )}
          </ul>
        </section>
        {b.canManage && (
          <section className="mt-7 border-t border-line pt-5">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <ArchiveRestore size={16} /> Backups
              </h3>
              <Button
                size="sm"
                loading={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    setBackups(
                      await api.post<Backup[]>(
                        `/api/boards/${b.board.id}/backups`,
                        {
                          name: `Backup · ${format(new Date(), "d MMM, HH:mm")}`,
                        },
                      ),
                    );
                    await load();
                    toast.success("Backup saved");
                  } catch (e) {
                    toast.error((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <Plus size={13} /> Save backup
              </Button>
            </div>
            <p className="mb-4 text-xs leading-relaxed text-muted">
              Save cards, lists, labels, attachments and appearance. Restoring
              also saves your current board. People and access stay as they are.
            </p>
            <ul className="space-y-2">
              {backups?.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-2 rounded-lg border border-line-soft bg-raised p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">{item.name}</p>
                    <p className="mt-1 text-[10px] text-faint">
                      {format(new Date(item.createdAt), "d MMM yyyy, HH:mm")}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => setRestore(item)}
                  >
                    <RotateCcw size={12} /> Restore
                  </Button>
                </li>
              ))}
            </ul>
            {backups?.length === 0 && (
              <p className="rounded-lg border border-dashed border-line p-5 text-center text-xs text-faint">
                No backups yet. Save your first checkpoint.
              </p>
            )}
          </section>
        )}
      </Drawer>
      <Modal
        open={!!restore}
        onOpenChange={(v) => !v && !busy && setRestore(null)}
        label="Restore board backup?"
        className="max-w-md"
      >
        <div className="space-y-4 p-6">
          <h2 className="text-lg font-semibold">Restore this backup?</h2>
          <p className="text-sm leading-relaxed text-muted">
            The board will return to “{restore?.name}”. A backup of your current
            board is saved first, so you can return to it.
          </p>
          <div className="flex justify-end gap-2">
            <Button disabled={busy} onClick={() => setRestore(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={busy}
              onClick={async () => {
                if (!restore) return;
                setBusy(true);
                try {
                  setBackups(
                    await api.patch<Backup[]>(
                      `/api/boards/${b.board.id}/backups`,
                      { backupId: restore.id },
                    ),
                  );
                  b.open(null);
                  await b.refresh();
                  setRestore(null);
                  await load();
                  toast.success("Board restored");
                } catch (e) {
                  toast.error((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Restore board
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
