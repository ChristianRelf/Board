"use client";

import { useState } from "react";
import { format, addDays, startOfTomorrow, set } from "date-fns";
import { Check, Plus, Tag, Trash2, X } from "lucide-react";
import { cx, LABEL_COLORS } from "@/lib/utils";
import { Button, IconButton } from "@/components/ui/Button";
import { Calendar } from "@/components/ui/Calendar";
import { Input } from "@/components/ui/Field";
import { Avatar } from "@/components/ui/Avatar";
import { Hint } from "@/components/ui/Hint";
import { useBoard } from "./store";
import type { CardT } from "@/lib/types";

export function LabelPicker({ card }: { card: CardT }) {
  const { labels, toggleLabel, createLabel, updateLabel, removeLabel } = useBoard();
  const [editing, setEditing] = useState<string | null>(null);

  return (
    <div className="space-y-1">
      {labels.map((l) => {
        const on = card.labelIds.includes(l.id);
        return (
          <div key={l.id} className="flex items-center gap-1">
            <button
              onClick={() => toggleLabel(card.id, l.id)}
              className="flex min-w-0 flex-1 items-center gap-2 rounded-sm px-1.5 py-1 text-left transition-colors duration-100 hover:bg-hover"
            >
              <span className="size-3 shrink-0 rounded-[3px]" style={{ background: l.color }} />
              {editing === l.id ? (
                <Input
                  autoFocus
                  defaultValue={l.name ?? ""}
                  placeholder="Label name"
                  className="h-6 text-[12px]"
                  onClick={(e) => e.stopPropagation()}
                  onBlur={(e) => {
                    updateLabel(l.id, { name: e.target.value.trim() || null });
                    setEditing(null);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                />
              ) : (
                <span
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setEditing(l.id);
                  }}
                  className="flex-1 truncate text-[12.5px] text-muted"
                >
                  {l.name || <span className="text-faint">Unnamed</span>}
                </span>
              )}
              {on && <Check size={13} className="shrink-0 text-accent" />}
            </button>
            <IconButton
              size="sm"
              variant="ghost"
              icon={<Trash2 size={12} />}
              label="Delete label"
              onClick={() => removeLabel(l.id)}
            />
          </div>
        );
      })}

      <div className="flex items-center gap-1 border-t border-line-soft pt-2">
        <span className="px-1 text-[11px] text-faint">New</span>
        <Hint side="right">
          Double-click a label to rename it. Colours are shared across the whole board.
        </Hint>
        <div className="ml-auto flex gap-1">
          {LABEL_COLORS.slice(0, 6).map((c) => (
            <button
              key={c.hex}
              aria-label={`Add ${c.name} label`}
              onClick={() => createLabel(c.hex)}
              className="size-4 rounded-[3px] transition-transform duration-150 hover:scale-115"
              style={{ background: c.hex }}
            />
          ))}
        </div>
      </div>
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
      dueAt: set(day, { hours: h || 0, minutes: m || 0, seconds: 0, milliseconds: 0 }).toISOString(),
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
          <Button key={q.label} size="sm" variant="subtle" onClick={() => commit(q.d)}>
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
          <Check size={13} className={card.dueDone ? "text-ok" : "text-faint"} />
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
            <span className="flex-1 truncate text-[12.5px] text-muted">{m.name ?? "Someone"}</span>
            {on && <Check size={13} className="text-accent" />}
          </button>
        );
      })}
      {!members.length && (
        <p className="px-1.5 py-2 text-[12px] text-faint">Invite people to the board first.</p>
      )}
    </div>
  );
}

export function CoverPicker({ card }: { card: CardT }) {
  const { patchCard } = useBoard();
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-4 gap-1.5">
        {LABEL_COLORS.map((c) => (
          <button
            key={c.hex}
            aria-label={`${c.name} cover`}
            onClick={() => patchCard(card.id, { cover: c.hex })}
            className={cx(
              "h-7 rounded-sm transition-transform duration-150 hover:scale-105",
              card.cover === c.hex && "ring-2 ring-accent ring-offset-2 ring-offset-raised",
            )}
            style={{ background: c.hex }}
          />
        ))}
      </div>
      {card.cover && (
        <Button size="sm" variant="ghost" onClick={() => patchCard(card.id, { cover: null })}>
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
              background: b.background?.kind === "color" ? b.background.value : "var(--color-hover)",
            }}
          />
          <span className="flex-1 truncate text-[12.5px] text-muted">{b.title}</span>
          {card.linkedBoard?.id === b.id && <Check size={13} className="text-accent" />}
        </button>
      ))}
      {!linkedBoards.length && (
        <p className="flex items-start gap-1.5 px-1.5 py-2 text-[12px] text-faint">
          <Tag size={13} className="mt-0.5 shrink-0" />
          Link boards together from the board menu, then attach one to a card here.
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
