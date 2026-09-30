"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { motion } from "motion/react";
import { cx } from "@/lib/utils";
import { Tooltip } from "./Tooltip";

type Variant = "primary" | "ghost" | "outline" | "danger" | "subtle";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-accent text-white hover:brightness-110 active:brightness-95 shadow-card",
  outline: "border border-line bg-surface/60 hover:bg-hover text-text",
  ghost: "text-muted hover:bg-hover hover:text-text",
  subtle: "bg-hover/70 text-text hover:bg-hover",
  danger: "text-danger hover:bg-danger/12",
};

const sizes: Record<Size, string> = {
  sm: "h-7 px-2.5 text-[12.5px] gap-1.5 rounded-md",
  md: "h-8.5 px-3 text-[13px] gap-2 rounded-md",
  lg: "h-10 px-4 text-[14px] gap-2 rounded-lg",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "outline", size = "md", loading, className, children, ...rest },
  ref,
) {
  return (
    <motion.button
      ref={ref}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.12 }}
      className={cx(
        "inline-flex select-none items-center justify-center font-medium transition-colors duration-150 disabled:pointer-events-none disabled:opacity-45",
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={rest.disabled || loading}
      {...(rest as React.ComponentProps<typeof motion.button>)}
    >
      {loading ? <Spinner /> : children}
    </motion.button>
  );
});

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cx(
        "size-3.5 animate-spin rounded-full border-[1.5px] border-current border-t-transparent opacity-70",
        className,
      )}
    />
  );
}

/** Square icon-only button. Always paired with a tooltip: no bare icons. */
export function IconButton({
  icon,
  label,
  side = "bottom",
  active,
  size = "md",
  variant = "ghost",
  className,
  ...rest
}: Omit<ButtonProps, "children"> & {
  icon: ReactNode;
  label: string;
  side?: "top" | "bottom" | "left" | "right";
  active?: boolean;
}) {
  const box = { sm: "size-7", md: "size-8.5", lg: "size-10" }[size];
  return (
    <Tooltip label={label} side={side}>
      <motion.button
        whileTap={{ scale: 0.94 }}
        transition={{ duration: 0.12 }}
        aria-label={label}
        className={cx(
          "grid shrink-0 place-items-center rounded-md transition-colors duration-150 disabled:pointer-events-none disabled:opacity-40",
          box,
          variants[variant],
          active && "bg-accent-soft! text-accent!",
          className,
        )}
        {...(rest as React.ComponentProps<typeof motion.button>)}
      >
        {icon}
      </motion.button>
    </Tooltip>
  );
}
