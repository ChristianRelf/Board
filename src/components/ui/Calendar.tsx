"use client";

import { useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cx } from "@/lib/utils";
import { IconButton } from "./Button";

/** Month grid. Week starts Monday. */
export function Calendar({
  value,
  onSelect,
}: {
  value: Date | null;
  onSelect: (d: Date) => void;
}) {
  const [cursor, setCursor] = useState(value ?? new Date());
  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 }),
  });

  return (
    <div className="select-none">
      <div className="mb-1 flex items-center justify-between">
        <IconButton
          size="sm"
          icon={<ChevronLeft size={14} />}
          label="Previous month"
          onClick={() => setCursor(subMonths(cursor, 1))}
        />
        <span className="text-[12.5px] font-medium">{format(cursor, "MMMM yyyy")}</span>
        <IconButton
          size="sm"
          icon={<ChevronRight size={14} />}
          label="Next month"
          onClick={() => setCursor(addMonths(cursor, 1))}
        />
      </div>
      <div className="grid grid-cols-7 gap-px text-center text-[10px] text-faint">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <span key={i} className="py-1">
            {d}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px">
        {days.map((d) => {
          const selected = value && isSameDay(d, value);
          return (
            <button
              key={d.toISOString()}
              onClick={() => onSelect(d)}
              className={cx(
                "grid h-7 place-items-center rounded-sm text-[12px] tabular-nums transition-colors duration-100",
                isSameMonth(d, cursor) ? "text-text" : "text-faint",
                selected ? "bg-accent text-white" : "hover:bg-hover",
                !selected && isToday(d) && "text-accent",
              )}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
