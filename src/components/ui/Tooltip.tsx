"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { cx } from "@/lib/utils";

type Side = "top" | "bottom" | "left" | "right";

/**
 * Custom tooltip — portalled so it never gets clipped by the board's
 * scroll containers, and keyboard reachable.
 */
export function Tooltip({
  label,
  side = "top",
  delay = 240,
  wide,
  children,
  className,
}: {
  label: ReactNode;
  side?: Side;
  delay?: number;
  wide?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const id = useId();
  const ref = useRef<HTMLSpanElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => () => clearTimeout(timer.current), []);

  function show() {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const r = ref.current?.getBoundingClientRect();
      if (!r) return;
      const gap = 8;
      const p = {
        top: { x: r.left + r.width / 2, y: r.top - gap },
        bottom: { x: r.left + r.width / 2, y: r.bottom + gap },
        left: { x: r.left - gap, y: r.top + r.height / 2 },
        right: { x: r.right + gap, y: r.top + r.height / 2 },
      }[side];
      // keep the bubble on screen when the trigger sits near an edge
      const margin = 10;
      const half = side === "top" || side === "bottom" ? 110 : 0;
      setPos({
        x: Math.min(Math.max(p.x, margin + half), window.innerWidth - margin - half),
        y: Math.min(Math.max(p.y, margin), window.innerHeight - margin),
      });
    }, delay);
  }

  function hide() {
    clearTimeout(timer.current);
    setPos(null);
  }

  const translate = {
    top: "translate(-50%, -100%)",
    bottom: "translate(-50%, 0)",
    left: "translate(-100%, -50%)",
    right: "translate(0, -50%)",
  }[side];

  const offset = {
    top: { y: 4 },
    bottom: { y: -4 },
    left: { x: 4 },
    right: { x: -4 },
  }[side];

  return (
    <>
      <span
        ref={ref}
        className={cx("inline-flex", className)}
        onPointerEnter={show}
        onPointerLeave={hide}
        onPointerDown={hide}
        onFocus={show}
        onBlur={hide}
        aria-describedby={pos ? id : undefined}
      >
        {children}
      </span>
      {mounted &&
        createPortal(
          <AnimatePresence>
            {pos && (
              <motion.span
                id={id}
                role="tooltip"
                initial={{ opacity: 0, scale: 0.96, ...offset }}
                animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.1 } }}
                transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                style={{ left: pos.x, top: pos.y, transform: translate }}
                className={cx(
                  "pointer-events-none fixed z-[200] rounded-md border border-line bg-raised px-2 py-1.5",
                  "text-[12px] leading-snug text-text shadow-pop",
                  wide ? "max-w-[260px]" : "max-w-[200px] whitespace-nowrap",
                )}
              >
                {label}
              </motion.span>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
