"use client";

import * as D from "@radix-ui/react-dialog";

export function BoardCreating({
  title,
  ready,
}: {
  title: string;
  ready: boolean;
}) {
  return (
    <D.Root open>
      <D.Portal>
        <D.Overlay className="board-creation-screen fixed inset-0 z-200 overflow-hidden">
          <div className="board-creation-sheet" aria-hidden="true" />
        </D.Overlay>
        <D.Content
          aria-describedby="creation-message"
          onEscapeKeyDown={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          className="fixed inset-0 z-201 grid overflow-hidden place-items-center p-6 text-[#16181b] outline-none"
        >
          <div className="board-creation-caption w-full max-w-lg text-center">
            <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.22em] text-[#656b73]">
              {ready ? "Board ready" : "Creating board"}
            </p>
            <D.Title className="break-words text-2xl font-medium tracking-tight">
              {title.trim() || "Your board"}
            </D.Title>
            <D.Description
              id="creation-message"
              className="mt-3 text-sm text-[#656b73]"
              role="status"
              aria-live="polite"
            >
              {ready ? "Opening your board…" : "Setting up your workspace…"}
            </D.Description>
          </div>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
