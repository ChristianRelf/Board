import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { listBoards } from "@/lib/board-data";
import { Dashboard } from "@/components/home/Dashboard";

export const metadata = { title: "Boards" };

export default async function Home() {
  const session = await auth();
  if (!session?.user) redirect("/signin");
  const boards = await listBoards(session.user.id);
  return <Dashboard boards={boards} user={session.user} />;
}
