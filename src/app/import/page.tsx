import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { TrelloImport } from "@/components/home/TrelloImport";

export const metadata = { title: "Import from Trello" };

export default async function ImportPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin?callbackUrl=/import");
  return <TrelloImport />;
}
