import { z } from "zod";

export const BackgroundInput = z
  .object({
    kind: z.enum(["color", "image"]),
    value: z.string().max(2048),
    dim: z.number().min(0).max(0.85).optional(),
    font: z.enum(["system", "serif", "mono", "rounded"]).optional(),
    accent: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .optional(),
    density: z.enum(["comfortable", "compact"]).optional(),
  })
  .refine(
    (b) =>
      b.kind === "color"
        ? /^#[0-9a-fA-F]{6}$/.test(b.value)
        : /^(https?:\/\/|\/api\/files\/)/.test(b.value),
    "Use a colour or a valid image URL",
  );

export const BOARD_FONTS = {
  system: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  mono: 'ui-monospace, "SFMono-Regular", Consolas, monospace',
  rounded: '"Arial Rounded MT Bold", "Trebuchet MS", sans-serif',
};
