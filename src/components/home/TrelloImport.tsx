"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, FileJson, Upload } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/client";
import { cx } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Hint } from "@/components/ui/Hint";

type Preview = {
  name: string;
  lists: number;
  cards: number;
  labels: number;
  attachments: number;
  comments: number;
};

export function TrelloImport() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);

  async function take(f: File | null | undefined) {
    if (!f) return;
    if (!/\.json$/i.test(f.name)) return toast.error("That needs to be the .json export");
    setFile(f);
    try {
      const raw = JSON.parse(await f.text());
      const cards = (raw.cards ?? []).filter((c: { closed?: boolean }) => !c.closed);
      setPreview({
        name: raw.name ?? "Untitled board",
        lists: (raw.lists ?? []).filter((l: { closed?: boolean }) => !l.closed).length,
        cards: cards.length,
        labels: new Set(
          cards.flatMap((c: { labels?: { name?: string; color?: string }[] }) =>
            (c.labels ?? []).map((l) => `${l.name}|${l.color}`),
          ),
        ).size,
        attachments: cards.reduce(
          (n: number, c: { attachments?: unknown[] }) => n + (c.attachments?.length ?? 0),
          0,
        ),
        comments: (raw.actions ?? []).filter(
          (a: { type?: string }) => a.type === "commentCard",
        ).length,
      });
    } catch {
      setPreview(null);
      toast.error("That file isn't valid JSON");
    }
  }

  async function run() {
    if (!file) return;
    setBusy(true);
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await api.post<{ slug: string; counts: Record<string, number> }>(
        "/api/import/trello",
        form,
      );
      toast.success(`Imported ${res.counts.cards} cards`);
      router.push(`/b/${res.slug}`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-[560px] px-6 py-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-[12.5px] text-muted transition-colors hover:text-text"
      >
        <ArrowLeft size={14} /> Boards
      </Link>

      <h1 className="mt-6 text-[20px] font-semibold tracking-tight">Import from Trello</h1>
      <p className="mt-1.5 flex items-start gap-1.5 text-[13px] leading-relaxed text-muted">
        In Trello: Board menu → Print, export and share → Export as JSON. Drop that file here.
        <Hint side="left">
          Lists, cards, descriptions, due dates, labels, checklists and comments all come across.
          Trello attachments arrive as links, because the files themselves live behind Trello&apos;s
          own auth.
        </Hint>
      </p>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          void take(e.dataTransfer.files[0]);
        }}
        onClick={() => inputRef.current?.click()}
        className={cx(
          "mt-6 grid cursor-pointer place-items-center rounded-xl border border-dashed px-6 py-12 text-center transition-[border-color,background-color] duration-200",
          over ? "border-accent bg-accent-soft/40" : "border-line hover:border-muted/50 hover:bg-hover/40",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => void take(e.target.files?.[0])}
        />
        <span className="grid size-10 place-items-center rounded-lg border border-line bg-raised text-muted">
          {file ? <FileJson size={17} /> : <Upload size={17} />}
        </span>
        <p className="mt-3 text-[13px] font-medium">{file ? file.name : "Drop the JSON export"}</p>
        <p className="mt-1 text-[12px] text-faint">or click to pick a file</p>
      </div>

      {preview && (
        <div className="mt-5 animate-fade-up rounded-lg border border-line bg-surface p-4">
          <p className="text-[13.5px] font-medium">{preview.name}</p>
          <dl className="mt-3 grid grid-cols-2 gap-y-2 text-[12.5px] sm:grid-cols-3">
            {[
              ["Lists", preview.lists],
              ["Cards", preview.cards],
              ["Labels", preview.labels],
              ["Attachments", preview.attachments],
              ["Comments", preview.comments],
            ].map(([k, v]) => (
              <div key={String(k)} className="flex items-baseline gap-1.5">
                <dd className="font-medium tabular-nums">{v}</dd>
                <dt className="text-faint">{k}</dt>
              </div>
            ))}
          </dl>
          <Button variant="primary" className="mt-4 w-full" loading={busy} onClick={run}>
            <Check size={14} /> Import as a new board
          </Button>
        </div>
      )}
    </main>
  );
}
