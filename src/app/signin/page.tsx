import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { Button } from "@/components/ui/Button";
import { Hint } from "@/components/ui/Hint";

export const metadata = { title: "Sign in" };

export default async function SignIn({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/");
  const { error, callbackUrl } = await searchParams;

  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <div className="w-full max-w-[320px] animate-fade-up">
        <div className="mb-7 flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-md border border-line bg-raised">
            <span className="block size-3 rounded-[3px] bg-accent" />
          </span>
          <span className="text-[15px] font-semibold tracking-tight">Board</span>
        </div>

        <h1 className="text-[22px] font-semibold tracking-tight">Sign in</h1>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
          Discord handles the account. Nothing else to remember.
        </p>

        {error && (
          <p className="mt-4 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-[12.5px] text-danger">
            {error === "AccessDenied"
              ? "That Discord account isn't on the allowlist."
              : "Sign-in failed. Try again."}
          </p>
        )}

        <form
          className="mt-6"
          action={async () => {
            "use server";
            await signIn("discord", { redirectTo: callbackUrl || "/" });
          }}
        >
          <Button type="submit" variant="primary" size="lg" className="w-full">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
              <path d="M20.317 4.369A19.79 19.79 0 0 0 15.885 3c-.2.357-.43.84-.59 1.222a14.9 14.9 0 0 0-4.588 0A11.3 11.3 0 0 0 10.11 3 19.74 19.74 0 0 0 5.68 4.372C2.84 8.59 2.07 12.29 2.46 15.94a19.9 19.9 0 0 0 5.99 3.03c.47-.64.89-1.32 1.25-2.03-.69-.26-1.35-.58-1.97-.96.17-.12.33-.25.48-.38a14.2 14.2 0 0 0 11.57 0c.16.13.32.26.49.38-.62.38-1.29.7-1.98.96.36.71.78 1.39 1.25 2.03a19.86 19.86 0 0 0 6-3.03c.46-4.22-.78-7.9-3.22-11.57ZM8.68 13.7c-1.18 0-2.15-1.08-2.15-2.41 0-1.32.95-2.41 2.15-2.41 1.21 0 2.18 1.09 2.16 2.41 0 1.33-.95 2.41-2.16 2.41Zm6.64 0c-1.18 0-2.15-1.08-2.15-2.41 0-1.32.95-2.41 2.15-2.41 1.21 0 2.18 1.09 2.16 2.41 0 1.33-.95 2.41-2.16 2.41Z" />
            </svg>
            Continue with Discord
          </Button>
        </form>

        <p className="mt-5 flex items-center gap-1.5 text-[11.5px] text-faint">
          Private instance
          <Hint side="right">
            Only Discord accounts on the server allowlist can get in. Public boards are the one
            exception — anyone with the link can read those.
          </Hint>
        </p>
      </div>
    </main>
  );
}
