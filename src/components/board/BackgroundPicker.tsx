"use client";

import { useRef, useState } from "react";
import { Check, Upload } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/client";
import { BOARD_FONTS } from "@/lib/appearance";
import { cx, LABEL_COLORS, labelTextColor } from "@/lib/utils";
import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { useBoard } from "./store";
import type { Background } from "@/lib/types";

const COLORS = [
  "#0b0c0e",
  "#14171a",
  "#1c2530",
  "#20262a",
  "#2b2320",
  "#1e2b26",
  "#262032",
  "#2d2430",
  "#e8e5df",
  "#d9e4e7",
  "#dfe7dc",
  "#e8dfe7",
];
export function BackgroundPicker() {
  const { board, patchBoard } = useBoard();
  const current = board.background ?? { kind: "color", value: "#14171a" };
  const [url, setUrl] = useState(current.kind === "image" ? current.value : "");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const set = (patch: Partial<Background>) =>
    patchBoard({ background: { ...current, ...patch } });
  return (
    <div className="space-y-6">
      <div>
        <p className="mb-3 text-sm font-medium">Make yourself at home.</p>
        <p className="text-xs leading-relaxed text-muted">
          Give this board its own background, type and colour. Changes are saved
          as you go.
        </p>
      </div>
      <section className="space-y-2">
        <h3 className="text-xs font-semibold">Background colour</h3>
        <div className="grid grid-cols-6 gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              aria-label={`Background ${c}`}
              onClick={() => set({ kind: "color", value: c })}
              className={cx(
                "grid h-9 place-items-center rounded-lg border border-line transition-transform hover:scale-105",
                current.kind === "color" &&
                  current.value === c &&
                  "ring-2 ring-accent ring-offset-2 ring-offset-surface",
              )}
              style={{ background: c, color: labelTextColor(c) }}
            >
              {current.kind === "color" && current.value === c && (
                <Check size={14} />
              )}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-xs text-muted">
          <input
            aria-label="Custom background colour"
            type="color"
            value={current.kind === "color" ? current.value : "#14171a"}
            onChange={(e) => set({ kind: "color", value: e.target.value })}
            className="h-7 w-9 cursor-pointer rounded border-0 bg-transparent"
          />{" "}
          Custom colour
        </label>
      </section>
      <section className="space-y-2">
        <h3 className="text-xs font-semibold">Background image</h3>
        {current.kind === "image" && (
          <img
            src={current.value}
            alt="Current board background"
            className="h-28 w-full rounded-lg object-cover"
          />
        )}
        <input
          hidden
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setBusy(true);
            try {
              const form = new FormData();
              form.set("file", file);
              const result = await api.post<{ url: string }>(
                `/api/boards/${board.id}/image`,
                form,
              );
              set({ kind: "image", value: result.url, dim: 0.35 });
              setUrl(result.url);
            } catch (e) {
              toast.error((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        />
        <Button
          className="w-full"
          loading={busy}
          onClick={() => fileRef.current?.click()}
        >
          <Upload size={14} /> Upload a photo
        </Button>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            try {
              const parsed = new URL(url);
              if (!["https:", "http:"].includes(parsed.protocol))
                throw new Error();
              set({
                kind: "image",
                value: parsed.href,
                dim: current.dim ?? 0.35,
              });
            } catch {
              toast.error("Enter a valid image URL");
            }
          }}
        >
          <Input
            aria-label="Background image URL"
            type="url"
            placeholder="Or paste an image URL"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <Button type="submit">Use</Button>
        </form>
        {current.kind === "image" && (
          <label className="flex items-center gap-3 pt-1 text-xs text-muted">
            Dim image
            <input
              type="range"
              min={0}
              max={0.85}
              step={0.05}
              value={current.dim ?? 0.35}
              onChange={(e) => set({ dim: Number(e.target.value) })}
              className="flex-1 accent-[var(--color-accent)]"
            />
            <span className="w-8 text-right tabular-nums">
              {Math.round((current.dim ?? 0.35) * 100)}%
            </span>
          </label>
        )}
      </section>
      <section className="space-y-2">
        <h3 className="text-xs font-semibold">Font</h3>
        <div className="grid grid-cols-2 gap-2">
          {(
            Object.entries(BOARD_FONTS) as [keyof typeof BOARD_FONTS, string][]
          ).map(([key, font]) => (
            <button
              key={key}
              onClick={() => set({ font: key })}
              className={cx(
                "rounded-lg border px-3 py-3 text-left transition-colors",
                (current.font ?? "system") === key
                  ? "border-accent bg-accent-soft/30"
                  : "border-line hover:bg-hover",
              )}
              style={{ fontFamily: font }}
            >
              <span className="block text-xl">Aa</span>
              <span className="text-xs capitalize text-muted">
                {key === "system" ? "Modern" : key}
              </span>
            </button>
          ))}
        </div>
      </section>
      <section className="space-y-2">
        <h3 className="text-xs font-semibold">Accent colour</h3>
        <div className="flex flex-wrap gap-2">
          {["#5b6ef5", ...LABEL_COLORS.map((c) => c.hex)].map((c) => (
            <button
              key={c}
              aria-label={`Accent ${c}`}
              onClick={() => set({ accent: c })}
              className="grid size-7 place-items-center rounded-full"
              style={{ background: c, color: labelTextColor(c) }}
            >
              {(current.accent ?? "#5b6ef5") === c && <Check size={14} />}
            </button>
          ))}
        </div>
      </section>
      <section className="space-y-2">
        <h3 className="text-xs font-semibold">Card spacing</h3>
        <div className="flex gap-2">
          {(["comfortable", "compact"] as const).map((d) => (
            <Button
              key={d}
              className="flex-1 capitalize"
              variant={
                (current.density ?? "comfortable") === d ? "primary" : "outline"
              }
              onClick={() => set({ density: d })}
            >
              {d}
            </Button>
          ))}
        </div>
      </section>
    </div>
  );
}
