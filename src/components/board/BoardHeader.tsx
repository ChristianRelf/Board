"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  Copy,
  Download,
  Eye,
  Globe,
  LayoutGrid,
  Link2,
  Lock,
  Palette,
  Search,
  SlidersHorizontal,
  Star,
  Trash2,
  Unlink,
  X,
} from "lucide-react";
import { cx, labelTextColor } from "@/lib/utils";
import { api } from "@/lib/client";
import { toast } from "sonner";
import { Button, IconButton, Spinner } from "@/components/ui/Button";
import { HeaderButton, HeaderLink } from "@/components/ui/HeaderAction";
import { Pop } from "@/components/ui/Pop";
import { Hint } from "@/components/ui/Hint";
import { Avatar, AvatarTip } from "@/components/ui/Avatar";
import { Input } from "@/components/ui/Field";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { ActivityDrawer } from "./ActivityDrawer";
import { PeoplePicker } from "./PeoplePicker";
import { Drawer } from "@/components/ui/Drawer";
import { motion, AnimatePresence } from "motion/react";
import { BackgroundPicker } from "./BackgroundPicker";
import { MenuItem } from "./ListColumn";
import { useBoard } from "./store";
import type { BoardRef } from "@/lib/types";

export function BoardHeader({ readOnly }: { readOnly?: boolean }) {
  const b = useBoard();
  const router = useRouter();
  const [title, setTitle] = useState(b.board.title);

  useEffect(() => setTitle(b.board.title), [b.board.title]);

  return (
    <header className="glass z-20 flex min-h-12 shrink-0 flex-wrap items-center gap-1.5 border-b border-line px-3 py-1.5 md:flex-nowrap">
      <HeaderLink
        href="/"
        label="All boards"
        revealLabel="Boards"
        icon={<LayoutGrid size={16} />}
      />

      <input
        value={title}
        disabled={!b.canManage}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={() =>
          title.trim() && title !== b.board.title && b.patchBoard({ title: title.trim() })
        }
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        aria-label="Board title"
        className="min-w-0 max-w-[min(280px,40vw)] shrink rounded-md border border-transparent bg-transparent px-2 py-1 text-[14px] font-semibold tracking-tight outline-none transition-colors duration-150 hover:border-line focus:border-accent/60 focus:bg-surface"
        size={Math.max(6, Math.min(28, title.length))}
      />

      {b.canManage && (
        <HeaderButton
          icon={<Star size={14} className={b.board.starred ? "fill-warn text-warn" : ""} />}
          label={b.board.starred ? "Unstar" : "Star this board"}
          revealLabel={b.board.starred ? "Unstar" : "Star"}
          aria-pressed={b.board.starred}
          onClick={() => b.patchBoard({ starred: !b.board.starred })}
        />
      )}

      <VisibilityChip />

      <div className="scroll-thin ml-auto flex w-full max-w-full shrink-0 items-center gap-1 overflow-x-auto p-1 md:w-auto">
        <PresenceStack />
        {!readOnly && (
          <>
            <FilterPop />
            <PeoplePicker />
            <LinksPop />
            {b.canManage && <AppearanceMenu />}
            <ExportButton />
            <ActivityDrawer />
          </>
        )}
        <ThemeToggle revealLabel />
        {b.role === "owner" && (
          <Pop
            className="w-56"
            align="end"
            title="Danger zone"
            trigger={<HeaderButton icon={<Trash2 size={16} />} label="Delete board" danger />}
          >
            <p className="px-1 pb-2 text-[12px] leading-relaxed text-muted">
              Deleting removes every list, card and attachment on this board. There is no undo.
            </p>
            <MenuItem
              icon={<Trash2 size={14} />}
              label="Delete this board"
              danger
              onClick={async () => {
                await api.del(`/api/boards/${b.board.id}`);
                router.push("/");
              }}
            />
          </Pop>
        )}
      </div>
    </header>
  );
}

function VisibilityChip() {
  const b = useBoard();
  const isPublic = b.board.visibility === "public";
  const url = `${typeof location !== "undefined" ? location.origin : ""}/p/${b.board.slug}`;

  return (
    <Pop
      className="w-72"
      title="Who can see this"
      trigger={
        <button
          className={cx(
            "flex h-7 items-center gap-1.5 rounded-md px-2 text-[12px] font-medium transition-colors duration-150",
            isPublic ? "bg-accent-soft text-accent" : "text-muted hover:bg-hover",
          )}
        >
          {isPublic ? <Globe size={13} /> : <Lock size={13} />}
          {isPublic ? "Public" : "Private"}
        </button>
      }
    >
      <div className="space-y-1">
        <Option
          icon={<Lock size={14} />}
          title="Private"
          body="Only you and the people you invite."
          active={!isPublic}
          disabled={!b.canManage}
          onClick={() => b.patchBoard({ visibility: "private" })}
        />
        <Option
          icon={<Globe size={14} />}
          title="Public"
          body="Anyone with the link can read it. Good for roadmaps."
          active={isPublic}
          disabled={!b.canManage}
          onClick={() => b.patchBoard({ visibility: "public" })}
        />
        {isPublic && (
          <div className="mt-2 flex items-center gap-1.5 border-t border-line-soft pt-2">
            <Input readOnly value={url} className="h-7 text-[11px] text-muted" />
            <IconButton
              size="sm"
              icon={<Copy size={13} />}
              label="Copy public link"
              onClick={() => {
                navigator.clipboard.writeText(url);
                toast.success("Public link copied");
              }}
            />
            <IconButton
              size="sm"
              icon={<Eye size={13} />}
              label="Preview the public view"
              onClick={() => window.open(`/p/${b.board.slug}`, "_blank")}
            />
          </div>
        )}
      </div>
    </Pop>
  );
}

function Option({
  icon,
  title,
  body,
  active,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  active?: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cx(
        "flex w-full gap-2 rounded-md px-2 py-2 text-left transition-colors duration-150 disabled:opacity-50",
        active ? "bg-hover" : "hover:bg-hover",
      )}
    >
      <span className={cx("mt-0.5", active ? "text-accent" : "text-faint")}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-[12.5px] font-medium">
          {title}
          {active && <Check size={12} className="text-accent" />}
        </span>
        <span className="block text-[11.5px] leading-snug text-faint">{body}</span>
      </span>
    </button>
  );
}

function PresenceStack() {
  const { peers, connected } = useBoard();
  if (!peers.length) return null;
  return (
    <div className="mr-1 flex shrink-0 items-center gap-1.5">
      <div className="flex -space-x-2 p-1">
        {peers.slice(0, 5).map((p) => (
          <AvatarTip key={p.id} user={p} size={24} ring={p.color} />
        ))}
        {peers.length > 5 && (
          <span className="grid size-6 place-items-center rounded-full bg-hover text-[10px] text-muted">
            +{peers.length - 5}
          </span>
        )}
      </div>
      <span
        title={connected ? "Live" : "Reconnecting…"}
        className={cx(
          "size-1.5 rounded-full transition-colors duration-300",
          connected ? "bg-ok" : "bg-warn animate-pulse",
        )}
      />
    </div>
  );
}

function FilterPop() {
  const b = useBoard();
  const f = b.filter;
  return (
    <Pop
      className="w-72"
      align="end"
      title="Filter"
      trigger={
        <HeaderButton
          icon={<SlidersHorizontal size={15} />}
          label="Filter cards"
          revealLabel="Filter"
          active={b.matches.active}
        />
      }
    >
      <div className="space-y-2.5">
        <div className="flex items-center gap-1.5 rounded-md border border-line px-2">
          <Search size={13} className="text-faint" />
          <input
            value={f.q}
            onChange={(e) => b.setFilter({ q: e.target.value })}
            placeholder="Title contains…"
            className="h-7 flex-1 bg-transparent text-[12.5px] outline-none placeholder:text-faint"
          />
        </div>

        <div>
          <p className="pb-1 text-[11px] uppercase tracking-wide text-faint">Labels</p>
          <div className="flex flex-wrap gap-1">
            {b.labels.map((l) => {
              const on = f.labelIds.includes(l.id);
              return (
                <button
                  key={l.id}
                  onClick={() =>
                    b.setFilter({
                      labelIds: on
                        ? f.labelIds.filter((x) => x !== l.id)
                        : [...f.labelIds, l.id],
                    })
                  }
                  className={cx(
                    "h-5 rounded-sm px-2 text-[11px] transition-[opacity,transform] duration-150",
                    on ? "ring-2 ring-accent ring-offset-2 ring-offset-raised" : "hover:brightness-110",
                  )}
                  style={{ background: l.color, color: labelTextColor(l.color) }}
                >
                  {l.name || "Unnamed"}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="pb-1 text-[11px] uppercase tracking-wide text-faint">People</p>
          <div className="flex flex-wrap gap-1">
            {b.members.map((m) => {
              const on = f.memberIds.includes(m.id);
              return (
                <button
                  key={m.id}
                  onClick={() =>
                    b.setFilter({
                      memberIds: on
                        ? f.memberIds.filter((x) => x !== m.id)
                        : [...f.memberIds, m.id],
                    })
                  }
                  className={cx("rounded-full transition-opacity duration-150", on ? "" : "opacity-40")}
                >
                  <Avatar user={m} size={22} ring={on ? "var(--color-accent)" : undefined} />
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="pb-1 text-[11px] uppercase tracking-wide text-faint">Due</p>
          <div className="flex gap-1">
            {(["any", "overdue", "week", "none"] as const).map((d) => (
              <button
                key={d}
                onClick={() => b.setFilter({ due: d })}
                className={cx(
                  "h-6 rounded-md px-2 text-[11.5px] capitalize transition-colors duration-150",
                  f.due === d ? "bg-accent-soft text-accent" : "text-muted hover:bg-hover",
                )}
              >
                {d === "week" ? "7 days" : d}
              </button>
            ))}
          </div>
        </div>

        {b.matches.active && (
          <Button size="sm" variant="ghost" className="w-full" onClick={b.clearFilter}>
            <X size={13} /> Clear filter
          </Button>
        )}
      </div>
    </Pop>
  );
}

function AppearanceMenu() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("appearance") === "1") {
      setOpen(true);
      url.searchParams.delete("appearance");
      window.history.replaceState(window.history.state, "", url);
    }
  }, []);
  return <><HeaderButton icon={<Palette size={16} />} label="Appearance" onClick={() => setOpen(true)} /><Drawer open={open} onOpenChange={setOpen} title="Appearance"><BackgroundPicker /></Drawer></>;
}

function LinksPop() {
  const b = useBoard();
  const [all, setAll] = useState<BoardRef[] | null>(null);

  async function load() {
    const rows = await api.get<(BoardRef & { cardCount: number })[]>("/api/boards");
    setAll(rows.filter((r) => r.id !== b.board.id));
  }

  const linkedIds = new Set(b.linkedBoards.map((l) => l.id));

  return (
    <Pop
      className="w-72"
      align="end"
      title="Linked boards"
      onOpenChange={(o) => { if (o && !all) void load().catch(e => toast.error(e.message)); }}
      trigger={
        <HeaderButton
          icon={<Link2 size={15} />}
          label="Linked boards"
          active={!!b.linkedBoards.length}
        />
      }
    >
      <div className="space-y-2">
        <p className="flex items-start gap-1.5 px-1 text-[11.5px] leading-snug text-faint">
          Linked boards can be dropped onto a list to create a card that points at them.
          <Hint side="left">
            Open the boards rail at the bottom-left of the board, then drag a board chip onto any
            list. The card keeps a live link to that board.
          </Hint>
        </p>

        {!!b.linkedBoards.length && (
          <ul className="space-y-0.5">
            <AnimatePresence initial={false}>{b.linkedBoards.map((l) => (
              <motion.li layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} key={l.id} className="group flex items-center gap-2 rounded-sm px-1 py-1">
                <span
                  className="size-3 rounded-[3px]"
                  style={{
                    background:
                      l.background?.kind === "color" ? l.background.value : "var(--color-hover)",
                  }}
                />
                <Link href={`/b/${l.slug}`} className="flex-1 truncate text-[12.5px] hover:underline">
                  {l.title}
                </Link>
                {b.canManage && (
                  <span className="opacity-0 transition-opacity group-hover:opacity-100">
                    <IconButton
                      size="sm"
                      icon={<Unlink size={12} />}
                      label="Unlink"
                      onClick={() => b.unlinkBoard(l.id)}
                    />
                  </span>
                )}
              </motion.li>
            ))}</AnimatePresence>
          </ul>
        )}

        {b.canManage && (
          <ul className="scroll-thin max-h-44 space-y-0.5 overflow-y-auto border-t border-line-soft pt-2">
            {(all ?? [])
              .filter((r) => !linkedIds.has(r.id))
              .map((r) => (
                <li key={r.id}>
                  <button
                    onClick={() => b.linkBoard(r)}
                    className="flex w-full items-center gap-2 rounded-sm px-1 py-1 text-left transition-colors hover:bg-hover"
                  >
                    <span
                      className="size-3 rounded-[3px]"
                      style={{
                        background:
                          r.background?.kind === "color" ? r.background.value : "var(--color-hover)",
                      }}
                    />
                    <span className="flex-1 truncate text-[12.5px] text-muted">{r.title}</span>
                    <Link2 size={12} className="text-faint" />
                  </button>
                </li>
              ))}
            {all && !all.filter((r) => !linkedIds.has(r.id)).length && (
              <li className="px-1 py-1 text-[12px] text-faint">Nothing else to link.</li>
            )}
          </ul>
        )}
      </div>
    </Pop>
  );
}

function ExportButton() {
  const b = useBoard();
  const [busy, setBusy] = useState(false);
  const clicked = useRef(false);

  async function run() {
    if (clicked.current) return;
    clicked.current = true;
    setBusy(true);
    try {
      const node = document.getElementById("board-capture");
      if (!node) throw new Error("Nothing to export");
      const { toPng } = await import("html-to-image");
      // include lists that are scrolled out of view, and paint the board
      // background behind them — it lives outside the captured node
      const columns = [...node.querySelectorAll("section")];
      const rects = columns.map((c) => c.getBoundingClientRect());
      const pad = 16;
      const width = rects.length
        ? Math.max(...rects.map((r) => r.right)) - node.getBoundingClientRect().left + pad
        : node.scrollWidth;
      const height = rects.length
        ? Math.max(...rects.map((r) => r.height)) + pad * 2
        : node.clientHeight;
      const bg = b.board.background;
      const dataUrl = await toPng(node, {
        pixelRatio: 2,
        cacheBust: true,
        width,
        height,
        backgroundColor: bg?.kind === "color" ? bg.value : "#08090a",
        style: {
          width: `${width}px`,
          height: `${height}px`,
          overflow: "visible",
          ...(bg?.kind === "image"
            ? { backgroundImage: `url(${bg.value})`, backgroundSize: "cover" }
            : {}),
        },
        filter: (el) => !(el instanceof HTMLElement) || el.dataset.exportHide === undefined,
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `${b.board.slug}-${new Date().toISOString().slice(0, 10)}.png`;
      a.click();
      toast.success("Exported as PNG");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
      clicked.current = false;
    }
  }

  return (
    <HeaderButton
      icon={busy ? <Spinner /> : <Download size={15} />}
      label="Export board as image"
      revealLabel={busy ? "Exporting…" : "Export"}
      disabled={busy}
      aria-busy={busy}
      onClick={run}
    />
  );
}
