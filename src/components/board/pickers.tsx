"use client";

import { useRef, useState } from "react";
import { format, addDays, startOfTomorrow, set } from "date-fns";
import {
  ArrowUp,
  ArrowDown,
  Pencil,
  Upload,
  Check,
  Plus,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cx, LABEL_COLORS, labelTextColor } from "@/lib/utils";
import { Button, IconButton } from "@/components/ui/Button";
import { Calendar } from "@/components/ui/Calendar";
import { Input } from "@/components/ui/Field";
import { Avatar } from "@/components/ui/Avatar";
import { Hint } from "@/components/ui/Hint";
import { useBoard } from "./store";
import type { CardT } from "@/lib/types";

export function LabelPicker({ card }: { card: CardT }) {
  const b = useBoard();
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(LABEL_COLORS[0].hex);
  const [showAll, setShowAll] = useState(false);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const usage = new Map<string, number>();
  for (const c of b.cardsByList.get(card.listId) ?? [])
    for (const id of c.labelIds) usage.set(id, (usage.get(id) ?? 0) + 1);
  const popular = [...b.labels]
    .sort(
      (a, z) =>
        (usage.get(z.id) ?? 0) - (usage.get(a.id) ?? 0) ||
        a.position - z.position,
    )
    .slice(0, 5);
  const visible = b.labels.filter(
    (l) =>
      (showAll ||
        q ||
        popular.some((p) => p.id === l.id) ||
        card.labelIds.includes(l.id)) &&
      (l.name ?? "Unnamed").toLowerCase().includes(q.toLowerCase()),
  );
  function move(id: string, offset: number) {
    const index = b.labels.findIndex((l) => l.id === id);
    const ids = b.labels.map((l) => l.id);
    ids.splice(index + offset, 0, ids.splice(index, 1)[0]);
    b.reorderLabels(ids);
  }
  return (
    <div className="space-y-2">
      <Input
        aria-label="Search labels"
        placeholder="Search labels…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <p className="px-1 text-[10px] text-faint">
        {showAll
          ? "All labels · use arrows to reorder"
          : "Most used in this column"}
      </p>
      <div className="scroll-thin max-h-64 space-y-1 overflow-y-auto">
        {visible.map((l) => (
          <div key={l.id} className="flex items-center gap-1">
            {editing === l.id ? (
              <Input
                autoFocus
                defaultValue={l.name ?? ""}
                maxLength={60}
                onBlur={(e) => {
                  b.updateLabel(l.id, { name: e.target.value.trim() || null });
                  setEditing(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                  if (e.key === "Escape") setEditing(null);
                }}
              />
            ) : (
              <button
                onClick={() => b.toggleLabel(card.id, l.id)}
                aria-pressed={card.labelIds.includes(l.id)}
                className="flex min-h-7 min-w-0 flex-1 items-center gap-1 rounded-md px-2 text-left text-[12px] font-medium"
                style={{ background: l.color, color: labelTextColor(l.color) }}
              >
                <span className="flex-1 truncate">{l.name || "Unnamed"}</span>
                {card.labelIds.includes(l.id) && <Check size={13} />}
              </button>
            )}
            {showAll && (
              <>
                <IconButton
                  size="sm"
                  icon={<ArrowUp size={12} />}
                  label={`Move ${l.name || "label"} up`}
                  disabled={b.labels[0]?.id === l.id}
                  onClick={() => move(l.id, -1)}
                />
                <IconButton
                  size="sm"
                  icon={<ArrowDown size={12} />}
                  label={`Move ${l.name || "label"} down`}
                  disabled={b.labels.at(-1)?.id === l.id}
                  onClick={() => move(l.id, 1)}
                />
              </>
            )}
            <IconButton
              size="sm"
              icon={<Pencil size={12} />}
              label="Rename label"
              onClick={() => setEditing(l.id)}
            />
            {showAll && (
              <IconButton
                size="sm"
                icon={<Trash2 size={12} />}
                label="Delete label"
                onClick={() => b.removeLabel(l.id)}
              />
            )}
          </div>
        ))}
        {!visible.length && (
          <p className="p-2 text-xs text-faint">No matching labels.</p>
        )}
      </div>
      <div className="flex items-center justify-between border-t border-line-soft pt-2">
        <Button size="sm" variant="ghost" onClick={() => setShowAll(!showAll)}>
          {showAll ? "See less" : `See more (${b.labels.length})`}
        </Button>
        <Button
          size="sm"
          variant="subtle"
          onClick={() => setCreating(!creating)}
        >
          <Plus size={13} /> New label
        </Button>
      </div>
      {creating && (
        <form
          className="animate-pop-in space-y-2 rounded-md border border-line p-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (busy || !name.trim()) return;
            setBusy(true);
            try {
              const label = await b.createLabel(color, name.trim());
              b.toggleLabel(card.id, label.id);
              setCreating(false);
              setName("");
            } catch {
              /* store reports errors */
            } finally {
              setBusy(false);
            }
          }}
        >
          <Input
            autoFocus
            aria-label="Label name"
            placeholder="Label name"
            maxLength={60}
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="flex flex-wrap gap-1.5">
            {LABEL_COLORS.map((c) => (
              <button
                type="button"
                key={c.hex}
                aria-label={c.name}
                aria-pressed={color === c.hex}
                onClick={() => setColor(c.hex)}
                className="grid size-5 place-items-center rounded-sm"
                style={{ background: c.hex, color: labelTextColor(c.hex) }}
              >
                {color === c.hex && <Check size={12} />}
              </button>
            ))}
          </div>
          <Button type="submit" size="sm" variant="primary" loading={busy}>
            Create label
          </Button>
        </form>
      )}
    </div>
  );
}

export function DueEditor({ card }: { card: CardT }) {
  const { patchCard } = useBoard();
  const due = card.dueAt ? new Date(card.dueAt) : null;
  const [time, setTime] = useState(due ? format(due, "HH:mm") : "17:00");

  function commit(day: Date) {
    const [h, m] = time.split(":").map(Number);
    patchCard(card.id, {
      dueAt: set(day, {
        hours: h || 0,
        minutes: m || 0,
        seconds: 0,
        milliseconds: 0,
      }).toISOString(),
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {[
          { label: "Today", d: new Date() },
          { label: "Tomorrow", d: startOfTomorrow() },
          { label: "+1 week", d: addDays(new Date(), 7) },
        ].map((q) => (
          <Button
            key={q.label}
            size="sm"
            variant="subtle"
            onClick={() => commit(q.d)}
          >
            {q.label}
          </Button>
        ))}
      </div>
      <Calendar value={due} onSelect={commit} />
      <div className="flex items-center gap-2 border-t border-line-soft pt-2">
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          onBlur={() => due && commit(due)}
          className="h-7 rounded-md border border-line bg-transparent px-2 text-[12px] tabular-nums outline-none focus:border-accent/70"
        />
        <Button
          size="sm"
          variant="subtle"
          onClick={() => patchCard(card.id, { dueDone: !card.dueDone })}
        >
          <Check
            size={13}
            className={card.dueDone ? "text-ok" : "text-faint"}
          />
          {card.dueDone ? "Done" : "Mark done"}
        </Button>
        {card.dueAt && (
          <IconButton
            size="sm"
            icon={<X size={13} />}
            label="Clear due date"
            onClick={() => patchCard(card.id, { dueAt: null, dueDone: false })}
          />
        )}
      </div>
    </div>
  );
}

export function MemberPicker({ card }: { card: CardT }) {
  const { members, toggleMember } = useBoard();
  return (
    <div className="space-y-0.5">
      {members.map((m) => {
        const on = card.memberIds.includes(m.id);
        return (
          <button
            key={m.id}
            onClick={() => toggleMember(card.id, m.id)}
            className="flex w-full items-center gap-2 rounded-sm px-1.5 py-1 text-left transition-colors duration-100 hover:bg-hover"
          >
            <Avatar user={m} size={20} />
            <span className="flex-1 truncate text-[12.5px] text-muted">
              {m.name ?? "Someone"}
            </span>
            {on && <Check size={13} className="text-accent" />}
          </button>
        );
      })}
      {!members.length && (
        <p className="px-1.5 py-2 text-[12px] text-faint">
          Invite people to the board first.
        </p>
      )}
    </div>
  );
}

export function CoverPicker({ card }: { card: CardT }) {
  const b = useBoard();
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const images =
    b.detail[card.id]?.attachments.filter((a) =>
      a.mime?.startsWith("image/"),
    ) ?? [];
  return (
    <div className="space-y-3">
      <p className="text-[11px] text-faint">Colour</p>
      <div className="grid grid-cols-4 gap-1.5">
        {LABEL_COLORS.map((c) => (
          <button
            key={c.hex}
            aria-label={`${c.name} cover`}
            onClick={() => b.patchCard(card.id, { cover: c.hex })}
            className={cx(
              "h-7 rounded-sm",
              card.cover === c.hex &&
                "ring-2 ring-accent ring-offset-2 ring-offset-raised",
            )}
            style={{ background: c.hex }}
          />
        ))}
      </div>
      <p className="text-[11px] text-faint">Image</p>
      {!!images.length && (
        <div className="grid grid-cols-3 gap-1.5">
          {images.map((a) => (
            <button
              key={a.id}
              aria-label={`Use ${a.name} as cover`}
              onClick={() => b.patchCard(card.id, { cover: a.url })}
              className="overflow-hidden rounded-md"
            >
              <img
                src={a.url}
                alt={a.name}
                className="h-14 w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
      <input
        ref={file}
        hidden
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        onChange={async (e) => {
          const selected = e.target.files?.[0];
          if (!selected) return;
          setBusy(true);
          try {
            const result = await b.upload(card.id, [selected]);
            const added = result.attachments.find(
              (a) =>
                !b.detail[card.id]?.attachments.some((old) => old.id === a.id),
            );
            if (added) b.patchCard(card.id, { cover: added.url });
          } catch {
            /* store reports errors */
          } finally {
            setBusy(false);
            e.target.value = "";
          }
        }}
      />
      <Button
        size="sm"
        variant="subtle"
        className="w-full"
        loading={busy}
        onClick={() => file.current?.click()}
      >
        <Upload size={13} /> Upload image
      </Button>
      <form
        className="flex gap-1"
        onSubmit={(e) => {
          e.preventDefault();
          try {
            const parsed = new URL(url);
            if (!["http:", "https:"].includes(parsed.protocol))
              throw new Error();
            b.patchCard(card.id, { cover: parsed.href });
            setUrl("");
          } catch {
            toast.error("Enter a valid image URL");
          }
        }}
      >
        <Input
          type="url"
          required
          aria-label="Cover image URL"
          placeholder="Paste image URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <Button size="sm" type="submit">
          Use
        </Button>
      </form>
      {card.cover && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => b.patchCard(card.id, { cover: null })}
        >
          <X size={13} /> Remove cover
        </Button>
      )}
    </div>
  );
}

export function LinkedBoardPicker({ card }: { card: CardT }) {
  const { linkedBoards, setLinkedBoard } = useBoard();
  return (
    <div className="space-y-0.5">
      {linkedBoards.map((b) => (
        <button
          key={b.id}
          onClick={() => setLinkedBoard(card.id, b)}
          className="flex w-full items-center gap-2 rounded-sm px-1.5 py-1 text-left transition-colors duration-100 hover:bg-hover"
        >
          <span
            className="size-3 rounded-[3px]"
            style={{
              background:
                b.background?.kind === "color"
                  ? b.background.value
                  : "var(--color-hover)",
            }}
          />
          <span className="flex-1 truncate text-[12.5px] text-muted">
            {b.title}
          </span>
          {card.linkedBoard?.id === b.id && (
            <Check size={13} className="text-accent" />
          )}
        </button>
      ))}
      {!linkedBoards.length && (
        <p className="flex items-start gap-1.5 px-1.5 py-2 text-[12px] text-faint">
          <Tag size={13} className="mt-0.5 shrink-0" />
          Link boards together from the board menu, then attach one to a card
          here.
        </p>
      )}
      {card.linkedBoard && (
        <Button
          size="sm"
          variant="ghost"
          className="mt-1 w-full"
          onClick={() => setLinkedBoard(card.id, null)}
        >
          <X size={13} /> Unlink
        </Button>
      )}
    </div>
  );
}

export function AddLabelInline() {
  return <Plus size={13} />;
}
