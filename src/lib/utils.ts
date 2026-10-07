export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export function slugify(input: string) {
  const base = input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 48);
  return base || "board";
}

export const LABEL_COLORS = [
  { name: "sage", hex: "#6fa287" },
  { name: "sun", hex: "#d9a84e" },
  { name: "clay", hex: "#d17a52" },
  { name: "rose", hex: "#c9596d" },
  { name: "iris", hex: "#8a76d6" },
  { name: "sky", hex: "#5a8fd6" },
  { name: "teal", hex: "#4aa5a0" },
  { name: "slate", hex: "#7b8290" },
] as const;

/** Trello board backgrounds are loud; land them on our muted set instead. */
export const TRELLO_BG_MAP: Record<string, string> = {
  blue: "#1c2530",
  sky: "#1b2730",
  green: "#1e2b26",
  lime: "#1f2b23",
  orange: "#2b2320",
  red: "#2c2022",
  purple: "#262032",
  pink: "#2d2430",
  black: "#101113",
  grey: "#14171a",
  yellow: "#2a2620",
};

/** Trello's colour names → our palette, used by the importer. */
export const TRELLO_COLOR_MAP: Record<string, string> = {
  green: "#6fa287",
  yellow: "#d9a84e",
  orange: "#d17a52",
  red: "#c9596d",
  purple: "#8a76d6",
  blue: "#5a8fd6",
  sky: "#5a8fd6",
  lime: "#6fa287",
  pink: "#c9596d",
  black: "#7b8290",
  null: "#7b8290",
};

export function initials(name?: string | null) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function bytes(n?: number | null) {
  if (!n) return "";
  const u = ["B", "KB", "MB", "GB"];
  let i = 0;
  while (n >= 1024 && i < u.length - 1) (n /= 1024), i++;
  return `${n < 10 && i > 0 ? n.toFixed(1) : Math.round(n)} ${u[i]}`;
}

/** Pick the higher-contrast foreground using WCAG relative luminance. */
export function labelTextColor(hex: string) {
  const raw = hex.replace('#', '');
  const value = raw.length === 3 ? raw.split('').map(c => c + c).join('') : raw;
  const rgb = [0, 2, 4].map(i => {
    const c = parseInt(value.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  const luminance = rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
  return luminance > 0.179 ? '#000000' : '#ffffff';
}

export function isImageCover(cover: string) {
  return /^(https?:\/\/|\/api\/files\/)/i.test(cover);
}
