"use client";

import { useEffect } from "react";
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
    if (initialCardId) open(initialCardId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCardId]);

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden">
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

      <CardModal />
    </div>
  );
}
