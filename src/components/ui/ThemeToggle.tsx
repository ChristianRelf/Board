"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Tooltip } from "./Tooltip";

export const themeScript = `(()=>{try{const t=localStorage.getItem("theme")||"dark";document.documentElement.dataset.theme=t;}catch{}})()`;

export function ThemeToggle({ revealLabel: _revealLabel = false }: { revealLabel?: boolean }) {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  useEffect(() => { setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark"); }, []);
  function flip() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next); document.documentElement.dataset.theme = next;
    try { localStorage.setItem("theme", next); } catch { /* theme still works without storage */ }
  }
  return <Tooltip label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
    <button type="button" role="switch" aria-checked={theme === "light"} aria-label="Light mode" onClick={flip} className="relative mx-1 inline-flex h-8 w-[62px] shrink-0 items-center justify-around rounded-full border border-line bg-hover p-1">
      <span aria-hidden className={`absolute left-1 top-1 size-6 rounded-full border border-line bg-raised shadow-card transition-transform duration-200 ${theme === "light" ? "translate-x-[28px]" : "translate-x-0"}`} />
      <Moon aria-hidden size={13} className={`relative ${theme === "dark" ? "text-text" : "text-faint"}`} /><Sun aria-hidden size={14} className={`relative ${theme === "light" ? "text-text" : "text-faint"}`} />
    </button>
  </Tooltip>;
}
