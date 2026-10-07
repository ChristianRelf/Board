"use client";

import * as P from "@radix-ui/react-popover";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { cx } from "@/lib/utils";

/** Small floating panel used for every picker in the app. */
export function Pop({
  trigger,
  children,
  align = "start",
  side = "bottom",
  className,
  open,
  onOpenChange,
  title,
  onOpenAutoFocus,
  onCloseAutoFocus,
}: {
  trigger: ReactNode;
  children: ReactNode;
  align?: "start" | "center" | "end";
  side?: "top" | "bottom" | "left" | "right";
  className?: string;
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
  title?: string;
  onOpenAutoFocus?: (event: Event) => void;
  onCloseAutoFocus?: (event: Event) => void;
}) {
  return (
    <P.Root open={open} onOpenChange={onOpenChange}>
      <P.Trigger asChild>{trigger}</P.Trigger>
      <P.Portal>
        <P.Content
          align={align}
          side={side}
          sideOffset={6}
          collisionPadding={12}
          onOpenAutoFocus={onOpenAutoFocus}
          onCloseAutoFocus={onCloseAutoFocus}
          asChild
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className={cx(
              "z-150 w-64 rounded-lg border border-line bg-raised p-2 shadow-pop",
              className,
            )}
          >
            {title && (
              <div className="px-1 pb-2 pt-0.5 text-[11px] font-medium uppercase tracking-wide text-faint">
                {title}
              </div>
            )}
            {children}
          </motion.div>
        </P.Content>
      </P.Portal>
    </P.Root>
  );
}

export const PopClose = P.Close;
