"use client";

import Link from "next/link";
import { Globe, LayoutGrid } from "lucide-react";
import { Hint } from "@/components/ui/Hint";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useBoard } from "./store";

/** Read-only chrome for /p/[slug] — a roadmap someone shared. */
export function PublicHeader() {
  const { board } = useBoard();
  return (
    <header className="glass flex h-12 shrink-0 items-center gap-2 border-b border-line px-4">
      <Globe size={15} className="text-accent" />
      <h1 className="truncate text-[14px] font-semibold tracking-tight">{board.title}</h1>
      {board.description && (
        <p className="hidden truncate text-[12px] text-faint md:block">{board.description}</p>
      )}
      <span className="ml-auto flex items-center gap-2" data-export-hide>
        <Hint side="left">
          You are viewing a public, read-only board. Sign in to see the boards you belong to.
        </Hint>
        <ThemeToggle />
        <Link
          href="/"
          aria-label="Go to your boards"
          className="grid size-8 place-items-center rounded-md text-muted transition-colors duration-150 hover:bg-hover hover:text-text"
        >
          <LayoutGrid size={15} />
        </Link>
      </span>
    </header>
  );
}
