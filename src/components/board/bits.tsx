"use client";

import { format, isToday, isTomorrow, isPast, differenceInCalendarDays } from "date-fns";
import {
  AlignLeft,
  CalendarDays,
  CircleCheck,
  ListChecks,
  Clock,
  MessageSquare,
  Paperclip,
} from "lucide-react";
import { useBoard } from "./store";
import { cx, labelTextColor } from "@/lib/utils";
import { Tooltip } from "@/components/ui/Tooltip";
import type { CardT, Label } from "@/lib/types";

export function LabelBars({ labels }: { labels: Label[] }) {
  const { labelsExpanded, toggleLabelsExpanded } = useBoard();
  if (!labels.length) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {labels.map(l => (
        <button key={l.id} type="button"
          aria-label={`${labelsExpanded ? "Collapse" : "Expand"} all labels: ${l.name || "Unnamed"}`}
          aria-expanded={labelsExpanded}
          onPointerDown={e => e.stopPropagation()}
          onKeyDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); toggleLabelsExpanded(); }}
          className={cx("label-pill rounded-full text-[10px] font-semibold", labelsExpanded ? "min-h-5 min-w-6 px-2 py-0.5" : "h-2 w-8")}
          style={{ background: l.color, color: labelTextColor(l.color) }}
          title={l.name || "Unnamed label"}>
          {labelsExpanded && (l.name || "Unnamed")}
        </button>
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
  const Icon = tone === "done" ? CircleCheck : tone === "over" || tone === "soon" ? Clock : CalendarDays;
  const label = card.dueDone
    ? `Done · was due ${format(d, "d MMM yyyy, HH:mm")}`
    : `Due ${format(d, "EEE d MMM yyyy, HH:mm")}`;
  const chipClassName = cx(
    "inline-flex min-h-5 items-center gap-1.5 rounded-sm px-1.5 py-0.5 text-[11px] font-medium tabular-nums transition-colors duration-150",
    dueStyles[tone],
    onClick && "hover:brightness-125",
  );
  const content = <><Icon size={13} strokeWidth={1.8} aria-hidden="true" />{!compact && dueLabel(d)}</>;
  return (
    <Tooltip label={label}>
      {onClick ? (
        <button type="button" onClick={onClick} aria-label={label} className={chipClassName}>
          {content}
        </button>
      ) : (
        <span aria-label={label} className={chipClassName}>{content}</span>
      )}
    </Tooltip>
  );
}

/** Footer badges — icons only, counts where a number adds information. */
export function CardBadges({ card }: { card: CardT }) {
  const { counts } = card;
  const bits: { key: string; icon: React.ReactNode; text?: string; tip: string; complete?: boolean }[] = [];

  if (card.description)
    bits.push({ key: "desc", icon: <AlignLeft />, tip: "Has a description" });
  if (counts.checkTotal)
    bits.push({
      key: "check",
      icon: counts.checkDone === counts.checkTotal ? <CircleCheck /> : <ListChecks />,
      text: `${counts.checkDone}/${counts.checkTotal}`,
      tip: `${counts.checkDone} of ${counts.checkTotal} checklist items complete`,
      complete: counts.checkDone === counts.checkTotal,
    });
  if (counts.comments)
    bits.push({
      key: "com",
      icon: <MessageSquare />,
      text: String(counts.comments),
      tip: `${counts.comments} comment${counts.comments > 1 ? "s" : ""}`,
    });
  if (counts.attachments)
    bits.push({
      key: "att",
      icon: <Paperclip />,
      text: String(counts.attachments),
      tip: `${counts.attachments} attachment${counts.attachments > 1 ? "s" : ""}`,
    });
  if (!bits.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1 text-muted">
      {bits.map((b) => (
        <Tooltip key={b.key} label={b.tip}>
          <span
            aria-label={b.tip}
            className={cx(
              "inline-flex min-h-5 items-center gap-1 rounded-sm px-1 text-[11px] tabular-nums",
              b.complete && "bg-ok/12 text-ok",
            )}
          >
            <span aria-hidden="true" className="flex [&>svg]:size-3.5 [&>svg]:stroke-[1.8]">{b.icon}</span>
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
