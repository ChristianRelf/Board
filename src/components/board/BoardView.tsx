"use client";

import { useEffect } from "react";
import { BOARD_FONTS } from "@/lib/appearance";
import { ConnectionStatus } from "./ConnectionStatus";
import { BoardProvider, useBoard } from "./store";
import { BoardCanvas } from "./BoardCanvas";
import { BoardHeader } from "./BoardHeader";
import { CardModal } from "./CardModal";
import { PublicHeader } from "./PublicHeader";
import type { BoardSnapshot } from "@/lib/types";

export function BoardView({
  snapshot,
  variant = "app",
  initialCardId,
}: {
  snapshot: BoardSnapshot;
  variant?: "app" | "public";
  initialCardId?: string;
}) {
  return (
    <BoardProvider snapshot={snapshot} live={variant === "app"}>
      <Shell variant={variant} initialCardId={initialCardId} />
    </BoardProvider>
  );
}

function Shell({
  variant,
  initialCardId,
}: {
  variant: "app" | "public";
  initialCardId?: string;
}) {
  const { board, open } = useBoard();
  const bg = board.background;
  useEffect(() => {
    const root = document.documentElement;
    if (bg?.font) root.style.setProperty("--board-font", BOARD_FONTS[bg.font]);
    if (bg?.accent) {
      root.style.setProperty("--color-accent", bg.accent);
      root.style.setProperty("--color-accent-soft", `color-mix(in srgb, ${bg.accent} 18%, var(--color-surface))`);
    }
    return () => { for (const prop of ["--board-font", "--color-accent", "--color-accent-soft"]) root.style.removeProperty(prop); };
  }, [bg?.font, bg?.accent]);

  useEffect(() => {
    if (initialCardId) open(initialCardId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCardId]);

  return (
    <div data-density={bg?.density ?? "comfortable"} className="relative isolate flex h-dvh flex-col overflow-hidden">
      {/* background layer, kept behind everything and part of exports */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 transition-[background-color] duration-500"
        style={
          bg?.kind === "image"
            ? {
                backgroundImage: `url(${bg.value})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : { background: bg?.value ?? "var(--color-bg)" }
        }
      />
      {bg?.kind === "image" && (
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{ background: `rgba(6,7,9,${bg.dim ?? 0.5})` }}
        />
      )}

      {variant === "app" ? <BoardHeader /> : <PublicHeader />}

      <main className="flex min-h-0 flex-1 flex-col">
        <BoardCanvas />
      </main>

      {variant === "app" && <ConnectionStatus />}
      <CardModal />
    </div>
  );
}
