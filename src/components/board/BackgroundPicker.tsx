"use client";

import { useState } from "react";
import { Check, Image as ImageIcon } from "lucide-react";
import { cx } from "@/lib/utils";
import { Input } from "@/components/ui/Field";
import { Hint } from "@/components/ui/Hint";
import { useBoard } from "./store";
import type { Background } from "@/lib/types";

/** Flat colours and photos only — no gradients anywhere in here. */
const COLORS = [
  "#0b0c0e",
  "#14171a",
  "#1c2530",
  "#20262a",
  "#2b2320",
  "#1e2b26",
  "#262032",
  "#2d2430",
];

export function BackgroundPicker() {
  const { board, patchBoard } = useBoard();
  const [url, setUrl] = useState(board.background?.kind === "image" ? board.background.value : "");
  const current = board.background;

  const set = (bg: Background) => patchBoard({ background: bg });

  return (
    <div className="space-y-3">
      <div>
        <p className="px-1 pb-1.5 text-[11px] font-medium uppercase tracking-wide text-faint">
          Colour
        </p>
        <div className="grid grid-cols-4 gap-1.5">
          {COLORS.map((c) => (
            <button
              key={c}
              aria-label={`Background ${c}`}
              onClick={() => set({ kind: "color", value: c })}
              className={cx(
                "grid h-8 place-items-center rounded-md border border-line transition-transform duration-150 hover:scale-[1.04]",
                current?.kind === "color" && current.value === c && "ring-2 ring-accent",
              )}
              style={{ background: c }}
            >
              {current?.kind === "color" && current.value === c && (
                <Check size={12} className="text-white/80" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-1.5 px-1 pb-1.5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-faint">Photo</p>
          <Hint side="right">
            Paste any direct image URL — Unsplash, your own CDN, anything. It is dimmed
            automatically so cards stay readable.
          </Hint>
        </div>
        <form
          className="flex gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            if (url.trim()) set({ kind: "image", value: url.trim(), dim: 0.5 });
          }}
        >
          <Input
            value={url}
            placeholder="https://…"
            onChange={(e) => setUrl(e.target.value)}
            className="h-7 text-[12px]"
          />
          <button
            type="submit"
            aria-label="Use photo"
            className="grid size-7 shrink-0 place-items-center rounded-md border border-line text-muted transition-colors duration-150 hover:bg-hover hover:text-text"
          >
            <ImageIcon size={13} />
          </button>
        </form>
        {current?.kind === "image" && (
          <label className="mt-2 flex items-center gap-2 px-1 text-[11px] text-faint">
            Dim
            <input
              type="range"
              min={0}
              max={0.85}
              step={0.05}
              defaultValue={current.dim ?? 0.5}
              onChange={(e) =>
                set({ ...current, dim: Number(e.target.value) })
              }
              className="h-1 flex-1 accent-[var(--color-accent)]"
            />
          </label>
        )}
      </div>
    </div>
  );
}
