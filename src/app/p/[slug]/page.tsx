import { notFound } from "next/navigation";
import { boardIdFromSlug, getSnapshot } from "@/lib/board-data";
import { boardAccess } from "@/lib/auth-helpers";
import { BoardView } from "@/components/board/BoardView";

export const revalidate = 30;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const id = await boardIdFromSlug(slug);
  if (!id) return { title: "Not found" };
  const snap = await getSnapshot(id, "viewer");
  if (!snap || snap.board.visibility !== "public") return { title: "Not found" };
  return {
    title: snap.board.title,
    description: snap.board.description ?? undefined,
    robots: { index: true },
  };
}

/** Read-only public view. No auth, no realtime, no editing. */
export default async function PublicBoard({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const id = await boardIdFromSlug(slug);
  if (!id) notFound();

  const { board } = await boardAccess(id);
  if (!board || board.visibility !== "public") notFound();

  const snapshot = await getSnapshot(id, "viewer");
  if (!snapshot) notFound();

  return <BoardView snapshot={snapshot} variant="public" />;
}
