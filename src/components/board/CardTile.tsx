"use client";

import { memo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { PanelsTopLeft } from "lucide-react";
import { cx, isImageCover } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { CardBadges, DueChip, LabelBars } from "./bits";
import { useBoard } from "./store";
import type { CardT } from "@/lib/types";

export const CardTile = memo(function CardTile({
  card,
  listId,
  dimmed,
}: {
  card: CardT;
  listId: string;
  dimmed?: boolean;
}) {
  const { canEdit, open, loadDetail, pendingCards } = useBoard();
  const pending = pendingCards.includes(card.id);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    data: { type: "card", listId },
    disabled: !canEdit || pending,
    transition: { duration: 240, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
  });

  return (
    <div
      ref={setNodeRef}
      data-card-id={card.id}
      aria-busy={pending || undefined}
      data-drop-placeholder={isDragging || undefined}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: dimmed && !isDragging ? 0.35 : undefined,
      }}
      {...attributes}
      {...listeners}
      onPointerEnter={() => { if (!isDragging && !pending) void loadDetail(card.id).catch(() => {}); }}
      onFocus={() => { if (!pending) void loadDetail(card.id).catch(() => {}); }}
      onClick={() => !isDragging && !pending && open(card.id)}
      role="button"
      aria-label={card.title}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !isDragging && !pending) {
          e.preventDefault();
          open(card.id);
        } else {
          listeners?.onKeyDown?.(e);
        }
      }}
      className={cx(
        "group relative cursor-pointer rounded-md border border-line-soft bg-raised p-2 text-left shadow-card",
        "transition-[border-color,background-color,box-shadow,transform] duration-150",
        "hover:border-line hover:bg-hover active:cursor-grabbing",
        pending && "animate-fade-up border-accent/40",
        isDragging && "border-dashed border-accent/60! bg-accent/8! shadow-none",
      )}
    >
      <div className={isDragging ? "invisible" : undefined} aria-hidden={isDragging || undefined}>
        <CardContent card={card} />
        {pending && <span role="status" className="mt-1 block text-[10px] text-faint">Saving card…</span>}
      </div>
      {isDragging && (
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 grid place-items-center text-[11px] font-medium text-accent">
          Drop here
        </span>
      )}
    </div>
  );
});

function CardContent({ card }: { card: CardT }) {
  const { labels, members } = useBoard();
  const cardLabels = labels.filter((l) => card.labelIds.includes(l.id));
  const cardMembers = members.filter((m) => card.memberIds.includes(m.id));

  return (
    <>
      {card.cover && (
        <div
          className={cx("mb-2 rounded-sm bg-cover bg-center", isImageCover(card.cover) ? "h-28" : "h-8")}
          style={isImageCover(card.cover) ? { backgroundImage: `url(${JSON.stringify(card.cover)})` } : { background: card.cover }}
          aria-hidden
        />
      )}

      {!!cardLabels.length && (
        <div className="mb-1.5">
          <LabelBars labels={cardLabels} />
        </div>
      )}

      <p className="text-[13px] leading-snug text-text [overflow-wrap:anywhere]">
        {card.title}
      </p>

      {card.linkedBoard && (
        <span className="mt-1.5 inline-flex max-w-full items-center gap-1 truncate rounded-sm bg-accent-soft px-1.5 py-0.5 text-[11px] text-accent">
          <PanelsTopLeft size={13} strokeWidth={1.8} className="shrink-0" aria-hidden="true" />
          <span className="truncate">{card.linkedBoard.title}</span>
        </span>
      )}

      {(!!card.dueAt ||
        cardMembers.length > 0 ||
        !!card.description ||
        card.counts.comments > 0 ||
        card.counts.attachments > 0 ||
        card.counts.checkTotal > 0) && (
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
            <DueChip card={card} />
            <CardBadges card={card} />
          </div>
          {!!cardMembers.length && (
            <div className="ml-auto flex shrink-0 -space-x-1.5">
              {cardMembers.slice(0, 3).map((m) => (
                <Avatar key={m.id} user={m} size={20} className="ring-1 ring-raised" />
              ))}
              {cardMembers.length > 3 && (
                <span className="grid size-5 place-items-center rounded-full bg-hover text-[9px] text-muted">
                  +{cardMembers.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}

/** What follows the cursor while dragging. */
export function CardGhost({ card }: { card: CardT }) {
  return (
    <div aria-hidden="true" className="pointer-events-none w-full rotate-[1.5deg] rounded-md border border-accent/40 bg-raised p-2 shadow-drag">
      <CardContent card={card} />
    </div>
  );
}
