"use client";

import { format, isToday, isTomorrow, isPast, differenceInCalendarDays } from "date-fns";
import {
  AlignLeft,
  CheckSquare,
  Clock,
  MessageSquare,
  Paperclip,
  Link2,
} from "lucide-react";
import { cx } from "@/lib/utils";
import { Tooltip } from "@/components/ui/Tooltip";
import type { CardT, Label } from "@/lib/types";

export function LabelBars({ labels }: { labels: Label[] }) {
  if (!labels.length) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {labels.map((l) => (
        <Tooltip key={l.id} label={l.name || "Label"}>
          <span
            className="h-1.5 w-6 rounded-full transition-[width] duration-200"
            style={{ background: l.color }}
          />
        </Tooltip>
      ))}
    </div>
  );
}

export function dueTone(card: Pick<CardT, "dueAt" | "dueDone">) {
  if (!card.dueAt) return null;
  const d = new Date(card.dueAt);
  if (card.dueDone) return "done" as const;
  if (isPast(d)) return "over" as const;
  if (differenceInCalendarDays(d, new Date()) <= 2) return "soon" as const;
  return "later" as const;
}

export function dueLabel(date: Date) {
  if (isToday(date)) return `Today ${format(date, "HH:mm")}`;
  if (isTomorrow(date)) return `Tomorrow ${format(date, "HH:mm")}`;
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return format(date, sameYear ? "d MMM" : "d MMM yyyy");
}

const dueStyles = {
  done: "text-ok bg-ok/12",
  over: "text-danger bg-danger/12",
  soon: "text-warn bg-warn/12",
  later: "text-muted bg-hover",
} as const;

export function DueChip({
  card,
  onClick,
  compact,
}: {
  card: Pick<CardT, "dueAt" | "dueDone">;
  onClick?: () => void;
  compact?: boolean;
}) {
  const tone = dueTone(card);
  if (!tone || !card.dueAt) return null;
  const d = new Date(card.dueAt);
  return (
    <Tooltip
      label={
        card.dueDone
          ? `Done · was due ${format(d, "d MMM yyyy, HH:mm")}`
          : `Due ${format(d, "EEE d MMM yyyy, HH:mm")}`
      }
    >
      <button
        type="button"
        onClick={onClick}
        className={cx(
          "inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-[11px] font-medium tabular-nums transition-colors duration-150",
          dueStyles[tone],
          onClick && "hover:brightness-125",
        )}
      >
        <Clock size={11} strokeWidth={2.2} />
        {!compact && dueLabel(d)}
      </button>
    </Tooltip>
  );
}

/** Footer badges — icons only, counts where a number adds information. */
export function CardBadges({ card }: { card: CardT }) {
  const { counts } = card;
  const bits: { key: string; icon: React.ReactNode; text?: string; tip: string }[] = [];

  if (card.description)
    bits.push({ key: "desc", icon: <AlignLeft size={12} />, tip: "Has a description" });
  if (counts.checkTotal)
    bits.push({
      key: "check",
      icon: <CheckSquare size={12} />,
      text: `${counts.checkDone}/${counts.checkTotal}`,
      tip: "Checklist progress",
    });
  if (counts.comments)
    bits.push({
      key: "com",
      icon: <MessageSquare size={12} />,
      text: String(counts.comments),
      tip: `${counts.comments} comment${counts.comments > 1 ? "s" : ""}`,
    });
  if (counts.attachments)
    bits.push({
      key: "att",
      icon: <Paperclip size={12} />,
      text: String(counts.attachments),
      tip: `${counts.attachments} attachment${counts.attachments > 1 ? "s" : ""}`,
    });
  if (card.linkedBoard)
    bits.push({
      key: "link",
      icon: <Link2 size={12} />,
      tip: `Linked board · ${card.linkedBoard.title}`,
    });

  if (!bits.length) return null;
  return (
    <div className="flex items-center gap-2 text-faint">
      {bits.map((b) => (
        <Tooltip key={b.key} label={b.tip}>
          <span className="inline-flex items-center gap-1 text-[11px] tabular-nums">
            {b.icon}
            {b.text}
          </span>
        </Tooltip>
      ))}
    </div>
  );
}

export function ChecklistRing({ done, total }: { done: number; total: number }) {
  const pct = total ? done / total : 0;
  return (
    <span className="relative grid size-4 place-items-center">
      <svg viewBox="0 0 20 20" className="size-4 -rotate-90">
        <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="3" className="text-line" />
        <circle
          cx="10"
          cy="10"
          r="8"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          className="text-ok transition-[stroke-dashoffset] duration-300"
          strokeDasharray={50.26}
          strokeDashoffset={50.26 * (1 - pct)}
        />
      </svg>
    </span>
  );
}
