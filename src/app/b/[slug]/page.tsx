import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { boardAccess } from "@/lib/auth-helpers";
import { boardIdFromSlug, getSnapshot } from "@/lib/board-data";
import { BoardView } from "@/components/board/BoardView";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const id = await boardIdFromSlug(slug);
  if (!id) return { title: "Not found" };
  const snap = await getSnapshot(id, "viewer");
  return { title: snap?.board.title ?? "Board" };
}

export default async function BoardPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ card?: string }>;
}) {
  const { slug } = await params;
  const { card } = await searchParams;
  const id = await boardIdFromSlug(slug);
  if (!id) notFound();

  const { role } = await boardAccess(id);
  if (!role) {
    const session = await auth();
    redirect(session?.user ? "/" : `/signin?callbackUrl=/b/${slug}`);
  }

  const snapshot = await getSnapshot(id, role);
  if (!snapshot) notFound();

  return <BoardView snapshot={snapshot} initialCardId={card} />;
}
