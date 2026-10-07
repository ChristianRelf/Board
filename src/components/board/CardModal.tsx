"use client";

import { forwardRef, useEffect, useRef, useState, type ButtonHTMLAttributes } from "react";
import { format, formatDistanceToNow } from "date-fns";
import Link from "next/link";
import {
  AlignLeft,
  Archive,
  ArrowUpRight,
  CalendarDays,
  Check,
  Copy,
  Image as ImageIcon,
  ListChecks,
  Link2,
  MessageSquare,
  PanelsTopLeft,
  Paperclip,
  Plus,
  Send,
  Tags,
  Trash2,
  Upload,
  UsersRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { bytes, cx, isImageCover } from "@/lib/utils";
import { Modal } from "@/components/ui/Modal";
import { Button, IconButton, Spinner } from "@/components/ui/Button";
import { Pop } from "@/components/ui/Pop";
import { Hint } from "@/components/ui/Hint";
import { Avatar } from "@/components/ui/Avatar";
import { Textarea, Input } from "@/components/ui/Field";
import { DueChip, ChecklistRing, LabelBars } from "./bits";
import { CoverPicker, DueEditor, LabelPicker, LinkedBoardPicker, MemberPicker } from "./pickers";
import { useBoard } from "./store";
import type { CardDetail } from "@/lib/types";

export function CardModal() {
  const b = useBoard();
  const card = b.cards.find((c) => c.id === b.openCardId);
  const detail = b.openCardId ? b.detail[b.openCardId] : undefined;

  useEffect(() => {
    if (b.openCardId) void b.loadDetail(b.openCardId).catch(e => toast.error(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [b.openCardId]);

  return (
    <Modal
      open={!!card}
      onOpenChange={(v) => !v && b.open(null)}
      label={card?.title ?? "Card"}
    >
      {card && <Body key={card.id} card={card} detail={detail} />}
    </Modal>
  );
}

function Body({
  card,
  detail,
}: {
  card: NonNullable<ReturnType<typeof useBoard>["cards"][number]>;
  detail?: CardDetail;
}) {
  const b = useBoard();
  const list = b.lists.find((l) => l.id === card.listId);
  const [title, setTitle] = useState(card.title);
  const [desc, setDesc] = useState(card.description ?? "");
  const [editingDesc, setEditingDesc] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const cardLabels = b.labels.filter((l) => card.labelIds.includes(l.id));
  const cardMembers = b.members.filter((m) => card.memberIds.includes(m.id));

  useEffect(() => setTitle(card.title), [card.title]);
  useEffect(() => setDesc(card.description ?? ""), [card.description]);

  return (
    <>
    {card.cover && <div className={cx("w-full rounded-t-xl bg-cover bg-center", isImageCover(card.cover) ? "h-44" : "h-16")} style={isImageCover(card.cover) ? { backgroundImage: `url(${JSON.stringify(card.cover)})` } : { background: card.cover }} />}
    <div className="grid gap-5 p-5 pr-12 md:grid-cols-[1fr_190px]">
      {/* ── main column ───────────────────────────────────── */}
      <div className="min-w-0 space-y-5">
        <div>
          <div className="mb-1 flex items-center gap-1.5 text-[11px] text-faint">
            <span className="truncate">{list?.title}</span>
            {card.linkedBoard && (
              <>
                <span>·</span>
                <Link
                  href={`/b/${card.linkedBoard.slug}`}
                  className="inline-flex items-center gap-1 text-accent hover:underline"
                >
                  <Link2 size={11} />
                  {card.linkedBoard.title}
                  <ArrowUpRight size={11} />
                </Link>
              </>
            )}
          </div>
          <textarea
            value={title}
            rows={1}
            disabled={!b.canEdit}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() =>
              title.trim() && title !== card.title && b.patchCard(card.id, { title: title.trim() })
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                e.currentTarget.blur();
              }
            }}
            className="w-full resize-none rounded-md border border-transparent bg-transparent px-1.5 py-0.5 text-[17px] font-semibold leading-snug outline-none transition-colors duration-150 hover:border-line focus:border-accent/60"
            style={{ fieldSizing: "content" } as React.CSSProperties}
          />
        </div>

        {(cardLabels.length > 0 || cardMembers.length > 0 || !!card.dueAt) && (
          <div className="flex flex-wrap items-center gap-3 px-1.5">
            {!!cardLabels.length && <LabelBars labels={cardLabels} />}
            {!!cardMembers.length && (
              <div className="flex -space-x-1.5">
                {cardMembers.map((m) => (
                  <Avatar key={m.id} user={m} size={22} className="ring-1 ring-surface" />
                ))}
              </div>
            )}
            <DueChip card={card} />
          </div>
        )}

        <Section icon={<AlignLeft size={15} />} title="Description">
          {editingDesc ? (
            <div className="space-y-2">
              <Textarea
                autoFocus
                rows={6}
                value={desc}
                placeholder="Add more detail…"
                onChange={(e) => setDesc(e.target.value)}
              />
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    b.patchCard(card.id, { description: desc.trim() || null });
                    setEditingDesc(false);
                  }}
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setDesc(card.description ?? "");
                    setEditingDesc(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <button
              disabled={!b.canEdit}
              onClick={() => setEditingDesc(true)}
              className={cx(
                "w-full rounded-md border border-transparent px-2 py-1.5 text-left text-[13px] leading-relaxed transition-colors duration-150",
                b.canEdit && "hover:border-line hover:bg-hover",
                card.description ? "whitespace-pre-wrap text-muted" : "text-faint",
              )}
            >
              {card.description || "Add more detail…"}
            </button>
          )}
        </Section>

        <Checklist card={card} detail={detail} />
        <Attachments card={card} detail={detail} />
        <Comments card={card} detail={detail} />
      </div>

      {/* ── side rail ────────────────────────────────────── */}
      <aside className="space-y-4 md:border-l md:border-line-soft md:pl-4" aria-label="Card actions">
        <RailGroup label="Add to card">
          <RailPop
            icon={<Tags />}
            label="Labels"
            title="Labels"
            active={cardLabels.length > 0}
            content={<LabelPicker card={card} />}
          />
          <RailPop
            icon={<UsersRound />}
            label="Members"
            title="Members"
            active={cardMembers.length > 0}
            content={<MemberPicker card={card} />}
          />
          <RailPop
            icon={<CalendarDays />}
            label="Due date"
            title="Due date"
            active={!!card.dueAt}
            className="w-72"
            content={<DueEditor card={card} />}
          />
          <RailPop
            icon={<ImageIcon />}
            label="Cover"
            title="Cover"
            active={!!card.cover}
            content={<CoverPicker card={card} />}
          />
          <RailPop
            icon={<PanelsTopLeft />}
            label="Linked board"
            title="Linked board"
            active={!!card.linkedBoard}
            content={<LinkedBoardPicker card={card} />}
          />
        </RailGroup>

        <RailGroup label="Actions">
          <RailButton
            icon={<Copy />}
            label="Copy link"
            aria-label="Copy link to card"
            onClick={() => {
              navigator.clipboard.writeText(
                `${location.origin}/b/${b.board.slug}?card=${card.id}`,
              );
            }}
          />
          <RailButton
            icon={<Archive />}
            label="Archive"
            onClick={() => {
              b.patchCard(card.id, { archived: true });
              b.open(null);
            }}
          />
          <RailButton
            icon={<Trash2 />}
            label="Delete card"
            aria-label="Delete card forever"
            danger
            onClick={() => setConfirmDelete(true)}
          />
        </RailGroup>

        <p className="px-1 pt-2 text-[10.5px] leading-relaxed text-faint">
          Added {formatDistanceToNow(new Date(card.createdAt), { addSuffix: true })}
        </p>
      </aside>
    </div>
    <Modal open={confirmDelete} onOpenChange={setConfirmDelete} label="Delete this card?" className="max-w-md">
      <div className="space-y-4 p-6">
        <h2 className="pr-8 text-lg font-semibold">Delete this card?</h2>
        <p className="text-sm text-muted">“{card.title}” and its checklist, comments and attachments will be removed. This cannot be undone without a board backup.</p>
        <div className="flex justify-end gap-2">
          <Button onClick={() => setConfirmDelete(false)}>Keep card</Button>
          <Button variant="danger" onClick={() => { b.removeCard(card.id); setConfirmDelete(false); b.open(null); }}>Delete permanently</Button>
        </div>
      </div>
    </Modal>
    </>
  );
}

/* ─────────────────────────── pieces ─────────────────────────── */

function Section({
  icon,
  title,
  action,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <header className="mb-1.5 flex items-center gap-2 px-1.5">
        <span aria-hidden="true" className="text-muted [&>svg]:stroke-[1.75]">{icon}</span>
        <h3 className="text-[11px] font-medium uppercase tracking-wide text-faint">{title}</h3>
        <div className="ml-auto flex items-center gap-1">{action}</div>
      </header>
      {children}
    </section>
  );
}

function RailGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">
        {label}
      </p>
      <div className="grid grid-cols-2 gap-1.5 md:grid-cols-1">{children}</div>
    </div>
  );
}

function RailPop({
  icon,
  label,
  title,
  content,
  className,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  title: string;
  content: React.ReactNode;
  className?: string;
  active?: boolean;
}) {
  const { canEdit } = useBoard();
  return (
    <Pop
      side="left"
      align="start"
      title={title}
      className={className}
      trigger={
        <RailButton
          icon={icon}
          label={label}
          active={active}
          disabled={!canEdit}
        />
      }
    >
      {content}
    </Pop>
  );
}

const RailButton = forwardRef<HTMLButtonElement, Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
  active?: boolean;
}>(function RailButton({
  icon,
  label,
  danger,
  active,
  className,
  ...props
}, ref) {
  const { canEdit } = useBoard();
  return (
    <button
      ref={ref}
      type="button"
      disabled={!canEdit}
      className={cx(
        "flex min-h-9 w-full items-center gap-2.5 rounded-md border px-2 py-1.5 text-left text-[12px] font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-40",
        danger
          ? "border-transparent text-danger hover:border-danger/20 hover:bg-danger/10"
          : "border-line-soft bg-raised/50 text-muted hover:border-line hover:bg-hover hover:text-text data-[state=open]:border-accent/30 data-[state=open]:bg-accent-soft/30 data-[state=open]:text-text",
        className,
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className={cx(
          "grid size-5 shrink-0 place-items-center [&>svg]:size-4 [&>svg]:stroke-[1.75]",
          active && !danger && "text-accent",
        )}
      >
        {icon}
      </span>
      <span className="flex-1">{label}</span>
      {active && <span className="size-1.5 shrink-0 rounded-full bg-accent"><span className="sr-only">Added to card</span></span>}
    </button>
  );
});

function Checklist({
  card,
  detail,
}: {
  card: { id: string; counts: { checkDone: number; checkTotal: number } };
  detail?: CardDetail;
}) {
  const b = useBoard();
  const [value, setValue] = useState("");
  const pending = b.pendingChecks[card.id] ?? [];
  const items = [...(detail?.checkItems ?? []), ...pending.filter(p => !detail?.checkItems.some(i => i.id === p.id))];
  const draft = useRef("");
  function commit() {
    const text = draft.current.trim();
    if (!text) return;
    draft.current = "";
    setValue("");
    void b.addCheck(card.id, text);
  }
  if (!items.length && !b.canEdit) return null;

  return (
    <Section
      icon={<ListChecks size={15} />}
      title="Checklist"
      action={
        items.length ? (
          <span className="flex items-center gap-1.5 text-[11px] tabular-nums text-faint">
            <ChecklistRing done={items.filter(i => i.done).length} total={items.length} />
            {items.filter(i => i.done).length}/{items.length}
          </span>
        ) : null
      }
    >
      <div className="space-y-0.5">
        {!detail && card.counts.checkTotal > 0 && <div className="skeleton h-12 rounded-md" aria-label="Loading checklist" />}
        {items.map((it) => (
          <div key={it.id} className="group flex items-center gap-2 rounded-sm px-1.5 py-1 hover:bg-hover">
            <button
              aria-label={it.done ? "Mark not done" : "Mark done"}
              disabled={!b.canEdit || pending.some(p => p.id === it.id)}
              onClick={() => b.patchCheck(card.id, it.id, { done: !it.done })}
              className={cx(
                "grid size-4 shrink-0 place-items-center rounded-[4px] border transition-colors duration-150",
                it.done ? "border-ok bg-ok text-white" : "border-line hover:border-muted",
              )}
            >
              {it.done && <Check size={11} strokeWidth={3.5} />}
            </button>
            <span
              className={cx(
                "flex-1 text-[13px] [overflow-wrap:anywhere]",
                it.done && "text-faint line-through",
              )}
            >
              {it.text}
            </span>
            {b.canEdit && (
              <span className="opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                <IconButton
                  size="sm"
                  icon={<X size={12} />}
                  label="Remove item"
                  disabled={pending.some(p => p.id === it.id)}
                  onClick={() => b.removeCheck(card.id, it.id)}
                />
              </span>
            )}
          </div>
        ))}
        {b.canEdit && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              commit();
            }}
            className="flex items-center gap-1.5 px-1.5 pt-1"
          >
            <Plus size={13} className="text-faint" />
            <input
              value={value}
              onChange={(e) => { draft.current = e.target.value; setValue(e.target.value); }}
              onBlur={commit}
              onKeyDown={e => { if (e.key === "Escape") { draft.current = ""; setValue(""); e.currentTarget.blur(); } }}
              maxLength={500}
              placeholder="Add an item"
              className="flex-1 bg-transparent py-1 text-[13px] outline-none placeholder:text-faint"
            />
          </form>
        )}
      </div>
    </Section>
  );
}

function Attachments({
  card,
  detail,
}: {
  card: { id: string };
  detail?: CardDetail;
}) {
  const b = useBoard();
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const items = detail?.attachments ?? [];

  async function upload(files: FileList | File[] | null) {
    if (!files?.length) return;
    setBusy(true);
    try {
      await b.upload(card.id, Array.from(files));
    } finally {
      setBusy(false);
    }
  }

  if (!items.length && !b.canEdit) return null;

  return (
    <Section
      icon={<Paperclip size={15} />}
      title="Attachments"
      action={
        b.canEdit && (
          <>
            <Hint side="left">
              Drop files anywhere in this panel, paste a URL to attach a link, or use the upload
              icon. 25 MB per file.
            </Hint>
            <Pop
              side="left"
              title="Attach a link"
              trigger={<IconButton size="sm" icon={<Link2 size={13} />} label="Attach a link" />}
            >
              <LinkForm onSubmit={(url, name) => b.attachLink(card.id, url, name)} />
            </Pop>
            <IconButton
              size="sm"
              icon={busy ? <Spinner /> : <Upload size={13} />}
              label="Upload a file"
              onClick={() => fileRef.current?.click()}
            />
          </>
        )
      }
    >
      <input
        ref={fileRef}
        type="file"
        multiple
        hidden
        onChange={(e) => void upload(e.target.files)}
      />
      <div
        onDragOver={(e) => {
          if (!b.canEdit) return;
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          if (!b.canEdit) return;
          e.preventDefault();
          setOver(false);
          void upload(e.dataTransfer.files);
        }}
        className={cx(
          "rounded-md border border-dashed p-1 transition-colors duration-150",
          over ? "border-accent bg-accent-soft/40" : "border-transparent",
        )}
      >
        {items.length ? (
          <ul className="space-y-1">
            {items.map((a) => {
              const isImage = a.mime?.startsWith("image/");
              return (
                <li
                  key={a.id}
                  className="group flex items-center gap-2 rounded-md px-1.5 py-1 transition-colors duration-150 hover:bg-hover"
                >
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-w-0 flex-1 items-center gap-2"
                  >
                    {isImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={a.url}
                        alt=""
                        className="size-9 shrink-0 rounded-sm border border-line object-cover"
                      />
                    ) : (
                      <span className="grid size-9 shrink-0 place-items-center rounded-sm border border-line text-faint">
                        {a.kind === "link" ? <Link2 size={14} /> : <Paperclip size={14} />}
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] text-text">{a.name}</span>
                      <span className="block text-[11px] text-faint">
                        {a.kind === "link" ? new URL(a.url, location.origin).hostname : bytes(a.size)}
                        {" · "}
                        {format(new Date(a.createdAt), "d MMM")}
                      </span>
                    </span>
                  </a>
                  {b.canEdit && (
                    <span className="opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                      <IconButton
                        size="sm"
                        icon={<Trash2 size={12} />}
                        label="Remove attachment"
                        onClick={() => b.removeAttachment(card.id, a.id)}
                      />
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="px-1.5 py-2 text-[12px] text-faint">
            {busy ? "Uploading…" : "Drop files here"}
          </p>
        )}
      </div>
    </Section>
  );
}

function LinkForm({ onSubmit }: { onSubmit: (url: string, name?: string) => Promise<void> }) {
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  return (
    <form
      className="space-y-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!url.trim()) return;
        void onSubmit(url.trim(), name.trim() || undefined);
        setUrl("");
        setName("");
      }}
    >
      <Input autoFocus placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} />
      <Input placeholder="Label (optional)" value={name} onChange={(e) => setName(e.target.value)} />
      <Button size="sm" variant="primary" className="w-full" type="submit">
        Attach
      </Button>
    </form>
  );
}

function Comments({ card, detail }: { card: { id: string }; detail?: CardDetail }) {
  const b = useBoard();
  const [value, setValue] = useState("");
  const items = detail?.comments ?? [];

  return (
    <Section icon={<MessageSquare size={15} />} title="Comments">
      {b.canEdit && (
        <form
          className="mb-2 flex items-start gap-2 px-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            const t = value.trim();
            if (!t) return;
            setValue("");
            void b.addComment(card.id, t);
          }}
        >
          <Textarea
            rows={2}
            value={value}
            placeholder="Write a comment…"
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter")
                e.currentTarget.form?.requestSubmit();
            }}
          />
          <IconButton icon={<Send size={14} />} label="Send (⌘↵)" type="submit" variant="outline" />
        </form>
      )}
      <ul className="space-y-2.5">
        {items.map((c) => (
          <li key={c.id} className="group flex gap-2 px-1.5">
            <Avatar user={c.user ?? { id: "x", name: null }} size={24} />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-[11px] text-faint">
                <span className="font-medium text-muted">{c.user?.name ?? "Someone"}</span>
                {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
              </p>
              <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-text [overflow-wrap:anywhere]">
                {c.body}
              </p>
            </div>
            {b.canEdit && (
              <span className="opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                <IconButton
                  size="sm"
                  icon={<Trash2 size={12} />}
                  label="Delete comment"
                  onClick={() => b.removeComment(card.id, c.id)}
                />
              </span>
            )}
          </li>
        ))}
        {!detail ? <li className="skeleton h-10 rounded-md" aria-label="Loading comments" /> : !items.length && <li className="px-1.5 text-[12px] text-faint">Nothing yet.</li>}
      </ul>
    </Section>
  );
}
