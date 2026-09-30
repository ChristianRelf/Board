import "server-only";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db, boards } from "./db";
import { slugify } from "./utils";

export async function uniqueSlug(title: string) {
  const base = slugify(title);
  for (let i = 0; i < 5; i++) {
    const slug = i === 0 ? base : `${base}-${nanoid(5).toLowerCase()}`;
    const [hit] = await db.select({ id: boards.id }).from(boards).where(eq(boards.slug, slug));
    if (!hit) return slug;
  }
  return `${base}-${nanoid(8).toLowerCase()}`;
}
