/** Sparse float positions: insert between neighbours, no reindexing pass. */
export const STEP = 1024;

export function between(prev?: number | null, next?: number | null) {
  if (prev == null && next == null) return STEP;
  if (prev == null) return next! - STEP;
  if (next == null) return prev + STEP;
  return (prev + next) / 2;
}

/** Position for dropping into `items` at `index` (already excluding the dragged item). */
export function positionAt(items: { position: number }[], index: number) {
  const prev = index > 0 ? items[index - 1]?.position : null;
  const next = items[index]?.position;
  return between(prev, next ?? null);
}
