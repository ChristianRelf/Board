"use client";

import { useEffect, useRef, useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  GripVertical,
  MoreHorizontal,
  Plus,
  Trash2,
} from "lucide-react";
import { cx } from "@/lib/utils";
import { IconButton } from "@/components/ui/Button";
import { Pop, PopClose } from "@/components/ui/Pop";
import { CardTile } from "./CardTile";
import { useBoard } from "./store";
import type { CardT, ListT } from "@/lib/types";

export function ListColumn({
  list,
  cards,
  dragging,
}: {
  list: ListT;
  cards: CardT[];
  dragging?: boolean;
}) {
  const {
    canEdit,
    renameList,
    removeList,
    toggleListCollapsed,
    addCard,
    matches,
  } = useBoard();
  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState(list.title);

  useEffect(() => setTitle(list.title), [list.title]);

  const sortable = useSortable({
    id: list.id,
    data: { type: "list" },
    disabled: !canEdit,
  });
  const { setNodeRef: setDropRef } = useDroppable({
    id: `dropzone:${list.id}`,
    data: { type: "list-body", listId: list.id },
  });

  const style = {
    transform: CSS.Translate.toString(sortable.transform),
    transition: sortable.transition,
  };

  if (list.collapsed)
    return (
      <div
        ref={sortable.setNodeRef}
        style={style}
        className="panel flex h-fit w-11 shrink-0 flex-col items-center gap-2 rounded-lg py-2.5"
      >
        {canEdit && (
          <IconButton
            size="sm"
            icon={<ChevronRight size={14} />}
            label="Expand list"
            side="right"
            onClick={() => toggleListCollapsed(list.id)}
          />
        )}
        <span
          className="max-h-[50vh] select-none truncate text-[12px] font-medium text-muted [writing-mode:vertical-rl]"
          title={list.title}
        >
          {list.title}
        </span>
        <span className="rounded-sm bg-hover px-1 text-[10px] tabular-nums text-faint">
          {cards.length}
        </span>
      </div>
    );

  return (
    <section
      ref={sortable.setNodeRef}
      style={style}
      className={cx(
        "panel flex max-h-full w-[288px] shrink-0 flex-col rounded-lg",
        sortable.isDragging && "opacity-40",
        dragging && "shadow-drag",
      )}
    >
      <header className="flex items-center gap-1 px-2 pt-2">
        {canEdit && (
          <button
            ref={sortable.setActivatorNodeRef}
            {...sortable.attributes}
            {...sortable.listeners}
            aria-label="Reorder list"
            data-export-hide
            className="grid size-6 shrink-0 cursor-grab place-items-center rounded-sm text-faint opacity-35 transition-opacity duration-150 hover:text-muted hover:opacity-100 focus-visible:opacity-100"
          >
            <GripVertical size={14} />
          </button>
        )}
        <input
          value={title}
          disabled={!canEdit}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => title.trim() && title !== list.title && renameList(list.id, title.trim())}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") setTitle(list.title);
          }}
          className="min-w-0 flex-1 rounded-sm border border-transparent bg-transparent px-1.5 py-1 text-[13px] font-semibold tracking-tight outline-none transition-colors duration-150 hover:border-line focus:border-accent/60 focus:bg-surface disabled:hover:border-transparent"
        />
        <span className="shrink-0 rounded-sm px-1 text-[11px] tabular-nums text-faint">
          {cards.length}
        </span>
        {canEdit && (
          <IconButton
            size="sm"
            data-export-hide
            icon={<ChevronLeft size={14} />}
            label="Collapse list"
            onClick={() => toggleListCollapsed(list.id)}
          />
        )}
        {canEdit && (
          <Pop
            className="w-52"
            align="end"
            trigger={
              <IconButton
                size="sm"
                data-export-hide
                icon={<MoreHorizontal size={14} />}
                label="List actions"
              />
            }
            title={list.title}
          >
            <MenuItem
              icon={<Plus size={14} />}
              label="Add a card"
              onClick={() => setComposing(true)}
            />
            <MenuItem
              icon={<Copy size={14} />}
              label="Copy list title"
              onClick={() => navigator.clipboard.writeText(list.title)}
            />
            <MenuItem
              icon={<Trash2 size={14} />}
              label={cards.length ? `Delete list + ${cards.length} cards` : "Delete list"}
              danger
              onClick={() => removeList(list.id)}
            />
          </Pop>
        )}
      </header>

      <div
        ref={setDropRef}
        className="scroll-thin flex min-h-[8px] flex-1 flex-col gap-1.5 overflow-y-auto p-2"
      >
        <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {cards.map((c) => (
            <CardTile key={c.id} card={c} dimmed={matches.active && !matches.test(c)} />
          ))}
        </SortableContext>
        {!cards.length && (
          <p data-export-hide className="select-none px-1 py-3 text-center text-[12px] text-faint">
            Drop cards here
          </p>
        )}
      </div>

      {canEdit && (
        <Composer
          open={composing}
          setOpen={setComposing}
          onSubmit={(t) => addCard(list.id, t)}
        />
      )}
    </section>
  );
}

function Composer({
  open,
  setOpen,
  onSubmit,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  onSubmit: (title: string) => Promise<unknown>;
}) {
  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) ref.current?.focus();
  }, [open]);

  async function commit(keepOpen: boolean) {
    const t = value.trim();
    if (!t) return setOpen(false);
    setValue("");
    await onSubmit(t);
    if (keepOpen) ref.current?.focus();
    else setOpen(false);
  }

  if (!open)
    return (
      <button
        onClick={() => setOpen(true)}
        data-export-hide
        className="m-2 mt-0 flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[12.5px] text-muted transition-colors duration-150 hover:bg-hover hover:text-text"
      >
        <Plus size={14} />
        Card
      </button>
    );

  return (
    <div data-export-hide className="m-2 mt-0 animate-pop-in">
      <textarea
        ref={ref}
        rows={2}
        value={value}
        placeholder="What needs doing?"
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => commit(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void commit(true);
          }
          if (e.key === "Escape") {
            setValue("");
            setOpen(false);
          }
        }}
        className="scroll-thin w-full resize-none rounded-md border border-accent/60 bg-raised p-2 text-[13px] leading-snug outline-none placeholder:text-faint"
      />
    </div>
  );
}

export function MenuItem({
  icon,
  label,
  onClick,
  danger,
  active,
}: {
  icon?: React.ReactNode;
  label: string;
  onClick?: () => void;
  danger?: boolean;
  active?: boolean;
}) {
  return (
    <PopClose asChild>
      <button
        onClick={onClick}
        className={cx(
          "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-[12.5px] transition-colors duration-100",
          danger ? "text-danger hover:bg-danger/12" : "text-muted hover:bg-hover hover:text-text",
          active && "text-text",
        )}
      >
        {icon}
        <span className="truncate">{label}</span>
      </button>
    </PopClose>
  );
}
