"use client";

import * as D from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cx } from "@/lib/utils";
import { IconButton } from "./Button";

export function Modal({
  open,
  onOpenChange,
  children,
  className,
  label,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  children: ReactNode;
  className?: string;
  label: string;
}) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <D.Portal forceMount>
            <D.Overlay asChild forceMount>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="fixed inset-0 z-100 bg-black/55 backdrop-blur-[3px]"
              />
            </D.Overlay>
            <D.Content asChild forceMount aria-label={label}>
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.99, transition: { duration: 0.14 } }}
                transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
                className={cx(
                  "fixed left-1/2 top-[7vh] z-101 max-h-[86vh] w-[min(760px,94vw)] -translate-x-1/2",
                  "scroll-thin overflow-y-auto rounded-xl border border-line bg-surface shadow-pop",
                  className,
                )}
              >
                <D.Title className="sr-only">{label}</D.Title>
                <D.Close asChild>
                  <div className="absolute right-3 top-3 z-10">
                    <IconButton icon={<X size={15} />} label="Close" side="left" />
                  </div>
                </D.Close>
                {children}
              </motion.div>
            </D.Content>
          </D.Portal>
        )}
      </AnimatePresence>
    </D.Root>
  );
}
