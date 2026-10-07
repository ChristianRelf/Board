"use client";

import * as D from "@radix-ui/react-dialog";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X } from "lucide-react";
import type { ReactNode } from "react";

export function Drawer({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
}) {
  const reduced = useReducedMotion();
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
                className="fixed inset-0 z-100 bg-black/30 backdrop-blur-[2px]"
              />
            </D.Overlay>
            <D.Content asChild forceMount aria-describedby={undefined}>
              <motion.aside
                initial={{ x: reduced ? 0 : "100%", opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: reduced ? 0 : "100%", opacity: 0 }}
                transition={{
                  duration: reduced ? 0 : 0.28,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="fixed inset-y-0 right-0 z-101 flex w-[min(420px,100vw)] flex-col border-l border-line bg-surface shadow-pop"
              >
                <header className="flex items-center justify-between border-b border-line-soft p-5">
                  <D.Title className="text-base font-semibold">{title}</D.Title>
                  <D.Close
                    aria-label={`Close ${title}`}
                    className="rounded-md p-1.5 text-muted hover:bg-hover"
                  >
                    <X size={18} />
                  </D.Close>
                </header>
                <div className="scroll-thin flex-1 overflow-y-auto p-5">
                  {children}
                </div>
              </motion.aside>
            </D.Content>
          </D.Portal>
        )}
      </AnimatePresence>
    </D.Root>
  );
}
