"use client";

import { Tooltip } from "./Tooltip";

/**
 * The little ? in a circle. Text lives here instead of in the UI, which is
 * how the interface stays mostly iconography.
 */
export function Hint({
  children,
  side = "top",
}: {
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
}) {
  return (
    <Tooltip label={children} side={side} wide delay={120}>
      <button
        type="button"
        aria-label="What's this?"
        className="grid size-[15px] shrink-0 place-items-center rounded-full border border-line text-[10px] font-medium leading-none text-faint transition-[color,border-color,transform] duration-150 hover:scale-110 hover:border-muted hover:text-muted"
      >
        ?
      </button>
    </Tooltip>
  );
}
