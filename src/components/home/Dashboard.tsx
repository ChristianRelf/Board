"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  Download,
  Check,
  Globe,
  Link2,
  LogOut,
  Lock,
  Plus,
  Search,
  Star,
  Upload,
} from "lucide-react";
import { BoardCreating } from "./BoardCreating";
import { toast } from "sonner";
import { api } from "@/lib/client";
import { doSignOut } from "@/app/actions";
import { cx } from "@/lib/utils";
import { Button, IconButton } from "@/components/ui/Button";
import { HeaderLink } from "@/components/ui/HeaderAction";
import { Pop } from "@/components/ui/Pop";
import { Input } from "@/components/ui/Field";
import { Hint } from "@/components/ui/Hint";
import { Avatar } from "@/components/ui/Avatar";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import type { Background } from "@/lib/types";

export type BoardCard = {
  id: string;
  title: string;
  slug: string;
  visibility: "private" | "public";
  background: Background | null;
  starred: boolean;
  ownerId: string;
  updatedAt: string;
  cardCount: number;
  canManage: boolean;
};

export function Dashboard({
  boards,
  user,
}: {
  boards: BoardCard[];
  user: { id: string; name?: string | null; image?: string | null };
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [dragged, setDragged] = useState<BoardCard | null>(null);
  const [linkState, setLinkState] = useState<{ id: string; status: "linking" | "linked" } | null>(null);
  const suppressClick = useRef(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const shown = useMemo(
    () => boards.filter((b) => b.title.toLowerCase().includes(q.toLowerCase())),
    [boards, q],
  );

  async function onDragEnd(e: DragEndEvent) {
    setDragged(null);
    suppressClick.current = true;
    setTimeout(() => { suppressClick.current = false; }, 250);
    const from = String(e.active.id);
    const onto = e.over ? String(e.over.id) : null;
    if (!onto || onto === from) return;
    const a = boards.find((b) => b.id === from);
    const target = boards.find((b) => b.id === onto);
    if (!a || !target) return;
    setLinkState({ id: target.id, status: "linking" });
    try {
      await api.post(`/api/boards/${target.id}/links`, { toBoardId: a.id });
      setLinkState({ id: target.id, status: "linked" });
      setTimeout(() => setLinkState(current => current?.id === target.id ? null : current), 2000);
      toast.success(`${a.title} linked into ${target.title}`);
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
      setLinkState(null);
    }
  }

  return (
    <div className="dashboard-screen mx-auto max-w-[1180px] px-6 py-5">
      <header className="flex items-center gap-2">
        <span className="grid size-7 place-items-center rounded-md border border-line bg-raised">
          <span className="block size-2.5 rounded-[3px] bg-accent" />
        </span>
        <span className="text-[14px] font-semibold tracking-tight">Board</span>

        <div className="ml-auto flex items-center gap-1.5">
          <div className="flex h-8 items-center gap-1.5 rounded-md border border-line px-2 transition-colors duration-150 focus-within:border-accent/60">
            <Search size={13} className="text-faint" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Find a board"
              className="w-36 bg-transparent text-[12.5px] outline-none placeholder:text-faint"
            />
          </div>
          <HeaderLink href="/import" icon={<Upload size={16} />} label="Import from Trello" revealLabel="Import" />
          <ThemeToggle revealLabel />
          <Pop
            align="end"
            className="w-56"
            title={user.name ?? "Account"}
            trigger={
              <button className="rounded-full">
                <Avatar user={{ id: user.id, name: user.name, image: user.image }} size={28} />
              </button>
            }
          >
            <p className="px-1 pb-2 text-[11.5px] leading-snug text-faint">
              Signed in with Discord. Your name and avatar come straight from there.
            </p>
            <form action={doSignOut}>
              <button
                type="submit"
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-[12.5px] text-muted transition-colors hover:bg-hover hover:text-text"
              >
                <LogOut size={14} /> Sign out
              </button>
            </form>
          </Pop>
        </div>
      </header>

      <div className="mt-8 flex items-end justify-between">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight">Your boards</h1>
          <p className="mt-1 flex items-center gap-1.5 text-[12.5px] text-muted">
            Drag one board onto another to link them
            <Hint side="right">
              Linking makes a board available inside another one: open the linked board rail at the
              bottom of a board and drag it onto a list to create a card that points at it.
            </Hint>
          </p>
        </div>
        <CreateBoard />
      </div>

      <DndContext id="boards" sensors={sensors} onDragStart={e => { suppressClick.current = true; setDragged(boards.find(b => b.id === String(e.active.id)) ?? null); }} onDragCancel={() => { setDragged(null); setTimeout(() => { suppressClick.current = false; }, 250); }} onDragEnd={onDragEnd}>
        <div className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(232px,1fr))] gap-3">
          {shown.map((b, i) => (
            <Tile key={b.id} board={b} index={i} canManage={b.canManage} suppressClick={suppressClick} linkStatus={linkState?.id === b.id ? linkState.status : undefined} />
          ))}
        </div>
        <DragOverlay dropAnimation={{ duration: 250, easing: "cubic-bezier(0.22,1,0.36,1)" }}>{dragged && <div className="flex rotate-3 items-center gap-3 rounded-xl border border-accent bg-raised p-5 shadow-drag"><Link2 className="text-accent" size={20} /><span className="text-sm font-medium">{dragged.title}</span></div>}</DragOverlay>
      </DndContext>

      {!boards.length && (
        <div className="mt-16 animate-fade-up text-center">
          <p className="text-[14px] font-medium">Nothing here yet</p>
          <p className="mx-auto mt-1.5 max-w-[320px] text-[13px] leading-relaxed text-muted">
            Make a board from scratch, or bring one over from Trello with its lists, cards, labels
            and due dates intact.
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <CreateBoard />
            <Link href="/import">
              <Button variant="outline">
                <Download size={14} /> Import from Trello
              </Button>
            </Link>
          </div>
        </div>
      )}

      {!!boards.length && !shown.length && (
        <p className="mt-16 text-center text-[13px] text-faint">No board matches “{q}”.</p>
      )}
    </div>
  );
}

function Tile({ board, index, canManage, suppressClick, linkStatus }: { board: BoardCard; index: number; canManage: boolean; suppressClick: React.RefObject<boolean>; linkStatus?: "linking" | "linked" }) {
  const drag = useDraggable({ id: board.id });
  const drop = useDroppable({ id: board.id, disabled: !canManage });
  const bg = board.background;

  return (
    <div
      ref={drop.setNodeRef}
      className={cx(
        "group relative rounded-lg transition-transform duration-150",
        drop.isOver && !drag.isDragging && "scale-[1.02]",
      )}
      style={{ animation: `fade-up 0.3s var(--ease-out-quint) ${Math.min(index * 28, 260)}ms both` }}
    >
      <Link
        onClick={e => { if (suppressClick.current || drag.isDragging) e.preventDefault(); }}
        href={`/b/${board.slug}`}
        ref={drag.setNodeRef}
        {...drag.attributes}
        {...drag.listeners}
        className={cx(
          "block overflow-hidden rounded-lg border border-line bg-surface transition-[border-color,box-shadow,transform] duration-200",
          "hover:border-muted/40 hover:shadow-pop",
          drag.isDragging && "opacity-40",
          drop.isOver && !drag.isDragging && "border-accent",
        )}
      >
        <div
          className="h-16 border-b border-line"
          style={
            bg?.kind === "image"
              ? { backgroundImage: `url(${bg.value})`, backgroundSize: "cover", backgroundPosition: "center" }
              : { background: bg?.value ?? "var(--color-raised)" }
          }
        />
        <div className="flex items-start gap-2 p-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13.5px] font-medium">{board.title}</p>
            <p className="mt-0.5 text-[11.5px] tabular-nums text-faint">
              {board.cardCount} {board.cardCount === 1 ? "card" : "cards"}
            </p>
          </div>
          <span className="flex items-center gap-1.5 pt-0.5 text-faint">
            {board.starred && <Star size={12} className="fill-warn text-warn" />}
            {board.visibility === "public" ? <Globe size={12} /> : <Lock size={12} />}
          </span>
        </div>
      </Link>

      {linkStatus && <div role="status" className="pointer-events-none absolute inset-0 flex animate-pop-in items-center justify-center gap-2 rounded-lg border border-accent bg-surface/90 text-sm font-medium text-accent backdrop-blur-sm">{linkStatus === "linking" ? <Link2 size={18} className="animate-pulse" /> : <Check size={18} />}{linkStatus === "linking" ? "Linking boards…" : "Boards linked"}</div>}
      {drop.isOver && !drag.isDragging && (
        <span className="pointer-events-none absolute right-2 top-2 flex items-center gap-1 rounded-md bg-accent px-1.5 py-0.5 text-[10.5px] font-medium text-white">
          <Link2 size={10} /> link
        </span>
      )}
    </div>
  );
}

const SWATCHES = ["#14171a", "#1c2530", "#2b2320", "#1e2b26", "#262032", "#20262a"];

function CreateBoard() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [color, setColor] = useState(SWATCHES[1]);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const creating = useRef(false);
  const [open, setOpen] = useState(false);

  async function create() {
    if (!title.trim() || creating.current) return;
    creating.current = true;
    setReady(false);
    setBusy(true);
    setOpen(false);
    try {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const [{ slug }] = await Promise.all([
        api.post<{ slug: string }>("/api/boards", {
          title: title.trim(), visibility, background: { kind: "color", value: color },
        }),
        // Let the white sheet cover the viewport before opening the board.
        new Promise(resolve => setTimeout(resolve, reduced ? 0 : 300)),
      ]);
      setReady(true);
      if (!reduced) await new Promise(resolve => setTimeout(resolve, 60));
      router.push(`/b/${slug}?appearance=1`);
    } catch (e) {
      toast.error((e as Error).message);
      setBusy(false);
      creating.current = false;
      setOpen(true);
    }
  }

  return (
    <>
    {busy && <BoardCreating title={title} ready={ready} />}
    <Pop
      open={open}
      onOpenChange={setOpen}
      align="end"
      className="w-72"
      title="New board"
      trigger={
        <Button variant="primary">
          <Plus size={14} /> New board
        </Button>
      }
    >
      <form
        className="space-y-2.5"
        onSubmit={(e) => {
          e.preventDefault();
          void create();
        }}
      >
        <Input autoFocus value={title} placeholder="Board name" onChange={(e) => setTitle(e.target.value)} />

        <div className="flex gap-1.5">
          {SWATCHES.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Colour ${c}`}
              onClick={() => setColor(c)}
              className={cx(
                "h-6 flex-1 rounded-sm border border-line transition-transform duration-150 hover:scale-105",
                color === c && "ring-2 ring-accent",
              )}
              style={{ background: c }}
            />
          ))}
        </div>

        <div className="flex gap-1">
          {(["private", "public"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setVisibility(v)}
              className={cx(
                "flex h-7 flex-1 items-center justify-center gap-1.5 rounded-md text-[12px] capitalize transition-colors duration-150",
                visibility === v ? "bg-accent-soft text-accent" : "text-muted hover:bg-hover",
              )}
            >
              {v === "public" ? <Globe size={12} /> : <Lock size={12} />}
              {v}
            </button>
          ))}
        </div>

        <Button type="submit" variant="primary" className="w-full" loading={busy}>
          Create
        </Button>
      </form>
    </Pop>
    </>
  );
}
