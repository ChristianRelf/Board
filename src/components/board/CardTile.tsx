"use client";

import { memo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ExternalLink } from "lucide-react";
import { cx } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { CardBadges, DueChip, LabelBars } from "./bits";
import { useBoard } from "./store";
import type { CardT } from "@/lib/types";

export const CardTile = memo(function CardTile({
  card,
  dimmed,
}: {
  card: CardT;
  dimmed?: boolean;
}) {
  const { labels, members, canEdit, open } = useBoard();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: card.id,
    data: { type: "card", listId: card.listId },
    disabled: !canEdit,
  });

  const cardLabels = labels.filter((l) => card.labelIds.includes(l.id));
  const cardMembers = members.filter((m) => card.memberIds.includes(m.id));

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: dimmed ? 0.35 : undefined,
      }}
      {...attributes}
      {...listeners}
      onClick={() => open(card.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") open(card.id);
      }}
      className={cx(
        "group relative cursor-pointer rounded-md border border-line-soft bg-raised p-2 text-left shadow-card",
        "transition-[border-color,background-color,box-shadow,transform] duration-150",
        "hover:border-line hover:bg-hover active:cursor-grabbing",
        isDragging && "opacity-30",
        "animate-pop-in",
      )}
    >
      {card.cover && (
        <div
          className="mb-2 h-8 rounded-sm"
          style={{ background: card.cover }}
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
          <ExternalLink size={10} />
          <span className="truncate">{card.linkedBoard.title}</span>
        </span>
      )}

      {(cardLabels.length > 0 ||
        !!card.dueAt ||
        cardMembers.length > 0 ||
        !!card.description ||
        card.counts.comments > 0 ||
        card.counts.attachments > 0 ||
        card.counts.checkTotal > 0) && (
        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <DueChip card={card} />
            <CardBadges card={card} />
          </div>
          {!!cardMembers.length && (
            <div className="flex -space-x-1.5">
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
    </div>
  );
});

/** What follows the cursor while dragging. */
export function CardGhost({ card }: { card: CardT }) {
  const { labels } = useBoard();
  const cardLabels = labels.filter((l) => card.labelIds.includes(l.id));
  return (
    <div className="w-[268px] rotate-[1.5deg] rounded-md border border-line bg-raised p-2 shadow-drag">
      {!!cardLabels.length && (
        <div className="mb-1.5">
          <LabelBars labels={cardLabels} />
        </div>
      )}
      <p className="text-[13px] leading-snug">{card.title}</p>
    </div>
  );
}
