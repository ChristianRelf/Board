"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { IconButton } from "./Button";

export const themeScript = `(()=>{try{const t=localStorage.getItem("theme")||"dark";document.documentElement.dataset.theme=t;}catch{}})()`;

export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    setTheme((document.documentElement.dataset.theme as "dark" | "light") || "dark");
  }, []);

  function flip() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    localStorage.setItem("theme", next);
  }

  return (
    <IconButton
      icon={theme === "dark" ? <Moon size={15} /> : <Sun size={15} />}
      label={theme === "dark" ? "Switch to light" : "Switch to dark"}
      onClick={flip}
    />
  );
}
