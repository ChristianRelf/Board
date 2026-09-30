"use client";

import { forwardRef } from "react";
import { cx } from "@/lib/utils";

const base =
  "w-full bg-transparent text-text placeholder:text-faint outline-none transition-colors duration-150";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return (
      <input
        ref={ref}
        className={cx(
          base,
          "h-8.5 rounded-md border border-line px-2.5 text-[13px] focus:border-accent/70",
          className,
        )}
        {...rest}
      />
    );
  },
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...rest }, ref) {
  return (
    <textarea
      ref={ref}
      className={cx(
        base,
        "scroll-thin resize-none rounded-md border border-line p-2.5 text-[13px] leading-relaxed focus:border-accent/70",
        className,
      )}
      {...rest}
    />
  );
});

/** Borderless input that only reveals itself on hover/focus — used for titles. */
export const InlineInput = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(function InlineInput({ className, ...rest }, ref) {
  return (
    <input
      ref={ref}
      className={cx(
        base,
        "rounded-md border border-transparent px-1.5 py-0.5 hover:border-line focus:border-accent/70 focus:bg-surface",
        className,
      )}
      {...rest}
    />
  );
});
