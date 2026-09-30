"use client";

import { useCallback, useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  closestCorners,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { BoardsRail } from "./BoardsRail";
import { CardGhost } from "./CardTile";
import { ListColumn } from "./ListColumn";
import { useBoard } from "./store";
import type { CardT } from "@/lib/types";

type Order = Record<string, string[]>;

export function BoardCanvas() {
  const board = useBoard();
  const { lists, cards, cardsByList, canEdit, moveCard, moveList, addCard, addList } = board;

  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<"card" | "list" | "board" | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [listOrder, setListOrder] = useState<string[] | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const cardById = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);

  const baseOrder = useCallback(
    (): Order =>
      Object.fromEntries(
        lists.map((l) => [l.id, (cardsByList.get(l.id) ?? []).map((c) => c.id)]),
      ),
    [lists, cardsByList],
  );

  const shownLists = useMemo(
    () =>
      (listOrder ?? lists.map((l) => l.id))
        .map((id) => lists.find((l) => l.id === id))
        .filter((l): l is (typeof lists)[number] => !!l),
    [listOrder, lists],
  );

  /** Cards per list, honouring the in-flight drag preview. Memoised so the
   *  sortable contexts keep stable item arrays and stop re-measuring. */
  const preview = useMemo(() => {
    const map = new Map<string, CardT[]>();
    for (const l of lists) {
      const ids = order?.[l.id];
      map.set(
        l.id,
        ids
          ? ids.map((id) => cardById.get(id)).filter((c): c is CardT => !!c)
          : (cardsByList.get(l.id) ?? []),
      );
    }
    return map;
  }, [lists, order, cardById, cardsByList]);

  function onDragStart(e: DragStartEvent) {
    const type = e.active.data.current?.type as typeof activeType;
    setActiveId(String(e.active.id));
    setActiveType(type ?? null);
    document.body.dataset.dragging = "true";
    if (type === "card") setOrder(baseOrder());
    if (type === "list") setListOrder(lists.map((l) => l.id));
  }

  function targetListOf(e: DragOverEvent | DragEndEvent) {
    const data = e.over?.data.current;
    if (!data) return null;
    if (data.type === "card") return data.listId as string;
    if (data.type === "list-body") return data.listId as string;
    if (data.type === "list") return e.over!.id as string;
    return null;
  }

  function onDragOver(e: DragOverEvent) {
    if (!e.over || e.over.id === e.active.id) return;
    const activeId = String(e.active.id);

    if (activeType === "list") {
      const overId =
        e.over.data.current?.type === "list"
          ? String(e.over.id)
          : (targetListOf(e) ?? String(e.over.id));
      setListOrder((prev) => {
        const current = prev ?? lists.map((l) => l.id);
        const from = current.indexOf(activeId);
        const to = current.indexOf(overId);
        if (from === -1 || to === -1 || from === to) return current;
        const next = current.slice();
        next.splice(to, 0, next.splice(from, 1)[0]);
        return next;
      });
      return;
    }

    if (activeType !== "card") return;
    const listId = targetListOf(e);
    if (!listId) return;
    const overIsCard = e.over.data.current?.type === "card";
    const overId = String(e.over.id);

    /* Only container changes happen here. Reordering inside one list is left
       to the sortable strategy, which shifts cards with transforms — doing it
       in state as well makes the hit-testing oscillate. */
    setOrder((prev) => {
      const current = prev ?? baseOrder();
      const fromList = Object.keys(current).find((k) => current[k].includes(activeId));
      if (!fromList || fromList === listId || !current[listId]) return current;

      const toIndex = overIsCard ? current[listId].indexOf(overId) : current[listId].length;
      const dest = current[listId].slice();
      dest.splice(toIndex === -1 ? dest.length : toIndex, 0, activeId);
      return {
        ...current,
        [fromList]: current[fromList].filter((id) => id !== activeId),
        [listId]: dest,
      };
    });
  }

  async function onDragEnd(e: DragEndEvent) {
    const id = String(e.active.id);
    const type = activeType;
    const finalOrder = order;
    const finalLists = listOrder;
    reset();

    if (!e.over) return;

    if (type === "board") {
      const listId = targetListOf(e);
      const title = e.active.data.current?.title as string | undefined;
      if (listId && title) await addCard(listId, title, id.replace(/^board:/, ""));
      return;
    }

    if (type === "list" && finalLists) {
      const index = finalLists.indexOf(id);
      if (index !== -1 && lists[index]?.id !== id) moveList(id, index);
      return;
    }

    if (type === "card") {
      const current = finalOrder ?? baseOrder();
      const listId = Object.keys(current).find((k) => current[k].includes(id));
      if (!listId) return;

      const overData = e.over.data.current;
      const overId = String(e.over.id);
      let index = current[listId].indexOf(id);

      if (overData?.type === "card" && overId !== id && current[listId].includes(overId))
        index = current[listId].indexOf(overId);
      else if (overData?.type !== "card") index = current[listId].length - 1;

      const original = cardById.get(id);
      const wasIndex = (cardsByList.get(original?.listId ?? "") ?? []).findIndex(
        (c) => c.id === id,
      );
      if (original?.listId === listId && wasIndex === index) return;
      moveCard(id, listId, index);
    }
  }

  function reset() {
    setActiveId(null);
    setActiveType(null);
    setOrder(null);
    setListOrder(null);
    delete document.body.dataset.dragging;
  }

  const activeCard = activeType === "card" && activeId ? cardById.get(activeId) : null;
  const activeList = activeType === "list" && activeId ? lists.find((l) => l.id === activeId) : null;

  return (
    <DndContext
      id="board"
      sensors={sensors}
      collisionDetection={(args) => {
        const within = pointerWithin(args);
        return within.length ? within : closestCorners(args);
      }}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      onDragCancel={reset}
    >
      <div
        id="board-capture"
        className="group/board scroll-thin flex flex-1 items-start gap-3 overflow-x-auto overflow-y-hidden px-4 pb-4 pt-3"
        style={{ maxHeight: "100%" }}
      >
        <SortableContext
          items={shownLists.map((l) => l.id)}
          strategy={horizontalListSortingStrategy}
        >
          {shownLists.map((l) => (
            <ListColumn key={l.id} list={l} cards={preview.get(l.id) ?? []} />
          ))}
        </SortableContext>

        {canEdit && <AddList onAdd={addList} />}
      </div>

      <BoardsRail />

      <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.22,1,0.36,1)" }}>
        {activeCard && <CardGhost card={activeCard} />}
        {activeType === "board" && activeId && (
          <div className="rounded-md border border-accent/60 bg-raised px-2 py-1.5 text-[12px] shadow-drag">
            {board.linkedBoards.find((l) => `board:${l.id}` === activeId)?.title ?? "Linked board"}
          </div>
        )}
        {activeList && (
          <div className="panel w-[288px] rotate-[1deg] rounded-lg p-2 shadow-drag">
            <p className="px-1 text-[13px] font-semibold">{activeList.title}</p>
            <p className="px-1 pt-1 text-[11px] text-faint">
              {(cardsByList.get(activeList.id) ?? []).length} cards
            </p>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

function AddList({ onAdd }: { onAdd: (title: string) => Promise<unknown> }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");

  async function commit() {
    const t = value.trim();
    setValue("");
    if (!t) return setOpen(false);
    await onAdd(t);
  }

  if (!open)
    return (
      <button
        onClick={() => setOpen(true)}
        data-export-hide
        className="panel flex h-9 w-[288px] shrink-0 items-center gap-1.5 rounded-lg px-3 text-[12.5px] text-muted transition-[background-color,color] duration-150 hover:text-text"
      >
        <Plus size={14} />
        List
      </button>
    );

  return (
    <div data-export-hide className="panel w-[288px] shrink-0 animate-pop-in rounded-lg p-2">
      <input
        autoFocus
        value={value}
        placeholder="List name"
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => void commit()}
        onKeyDown={(e) => {
          if (e.key === "Enter") void commit();
          if (e.key === "Escape") {
            setValue("");
            setOpen(false);
          }
        }}
        className="w-full rounded-sm border border-accent/60 bg-raised px-2 py-1.5 text-[13px] outline-none placeholder:text-faint"
      />
    </div>
  );
}
