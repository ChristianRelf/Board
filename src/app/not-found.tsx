import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-6 text-center">
      <div className="animate-fade-up">
        <p className="text-[13px] uppercase tracking-[0.18em] text-faint">404</p>
        <h1 className="mt-2 text-[20px] font-semibold tracking-tight">Nothing here</h1>
        <p className="mt-1.5 text-[13px] text-muted">
          The board either moved, was deleted, or was never yours to see.
        </p>
        <Link href="/" className="mt-5 inline-block">
          <Button variant="outline">Back to your boards</Button>
        </Link>
      </div>
    </main>
  );
}
