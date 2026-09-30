"use client";

import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { ChevronUp, GripVertical, Link2 } from "lucide-react";
import { cx } from "@/lib/utils";
import { Hint } from "@/components/ui/Hint";
import { IconButton } from "@/components/ui/Button";
import { useBoard } from "./store";
import type { BoardRef } from "@/lib/types";

/**
 * Bottom rail of linked boards. Drag a chip onto a list and you get a card
 * that points at that board — this is the board-to-board linking gesture.
 */
export function BoardsRail() {
  const { linkedBoards, canEdit } = useBoard();
  const [open, setOpen] = useState(true);
  if (!linkedBoards.length) return null;

  return (
    <div
      data-export-hide
      className="pointer-events-none absolute bottom-3 left-4 z-10 flex items-end gap-2"
    >
      <div
        className={cx(
          "panel pointer-events-auto flex items-center gap-1.5 rounded-lg p-1.5 transition-[max-width,opacity] duration-300",
          open ? "max-w-[70vw] opacity-100" : "max-w-11 opacity-90",
        )}
      >
        <IconButton
          size="sm"
          icon={
            <ChevronUp
              size={14}
              className={cx("transition-transform duration-300", open && "rotate-180")}
            />
          }
          label={open ? "Hide linked boards" : "Show linked boards"}
          side="top"
          onClick={() => setOpen(!open)}
        />
        {open && (
          <>
            <div className="scroll-thin flex max-w-[60vw] items-center gap-1.5 overflow-x-auto">
              {linkedBoards.map((b) => (
                <Chip key={b.id} board={b} draggable={canEdit} />
              ))}
            </div>
            <Hint side="top">
              Drag a board onto any list to create a card linked to it. Manage which boards appear
              here from the link icon in the top bar.
            </Hint>
          </>
        )}
      </div>
    </div>
  );
}

function Chip({ board, draggable }: { board: BoardRef; draggable: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `board:${board.id}`,
    data: { type: "board", title: board.title },
    disabled: !draggable,
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cx(
        "flex shrink-0 cursor-grab items-center gap-1.5 rounded-md border border-line bg-raised px-2 py-1 text-[12px] transition-colors duration-150 hover:bg-hover active:cursor-grabbing",
        isDragging && "opacity-40",
      )}
    >
      {draggable ? (
        <GripVertical size={12} className="text-faint" />
      ) : (
        <Link2 size={12} className="text-faint" />
      )}
      <span
        className="size-2.5 rounded-[2px]"
        style={{
          background:
            board.background?.kind === "color" ? board.background.value : "var(--color-hover)",
        }}
      />
      <span className="max-w-40 truncate">{board.title}</span>
    </div>
  );
}
