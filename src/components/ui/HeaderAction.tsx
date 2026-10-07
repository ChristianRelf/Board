"use client";

import { forwardRef, type ButtonHTMLAttributes, type ComponentProps, type ReactNode } from "react";
import Link from "next/link";
import { cx } from "@/lib/utils";

type ActionContent = {
  icon: ReactNode;
  label: string;
  revealLabel?: string;
};

function Content({ icon, label, revealLabel }: ActionContent) {
  return (
    <>
      <span className="header-action-icon" aria-hidden="true">{icon}</span>
      <span className="header-action-label" aria-hidden="true">
        <span><span>{revealLabel ?? label}</span></span>
      </span>
    </>
  );
}

/** Compact header controls that reveal their names on hover, focus, or open. */
export const HeaderButton = forwardRef<
  HTMLButtonElement,
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & ActionContent & {
    active?: boolean;
    danger?: boolean;
  }
>(function HeaderButton({ icon, label, revealLabel, active, danger, className, ...props }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      data-active={active || undefined}
      data-danger={danger || undefined}
      className={cx("header-action", className)}
      {...props}
    >
      <Content icon={icon} label={label} revealLabel={revealLabel} />
    </button>
  );
});

export function HeaderLink({
  icon, label, revealLabel, className, ...props
}: Omit<ComponentProps<typeof Link>, "children"> & ActionContent) {
  return (
    <Link aria-label={label} className={cx("header-action", className)} {...props}>
      <Content icon={icon} label={label} revealLabel={revealLabel} />
    </Link>
  );
}
