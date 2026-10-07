"use server";

import { signOut } from "@/auth";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db, sessions, users } from "@/lib/db";
import { devSessionCookie } from "@/lib/dev-login";

export async function doDevSignIn(callbackUrl?: string) {
  if (process.env.NODE_ENV !== "development") {
    throw new Error("Local sign-in is only available in development.");
  }

  const userId = "dev-user-1";
  const sessionToken = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await db.transaction(async (tx) => {
    // Reuse the demo account without resetting its boards or profile.
    await tx.insert(users).values({ id: userId, name: "Local developer" })
      .onConflictDoNothing({ target: users.id });
    await tx.insert(sessions).values({ sessionToken, userId, expires });
  });

  (await cookies()).set(devSessionCookie.name, sessionToken, {
    ...devSessionCookie.options,
    expires,
  });

  const destination = typeof callbackUrl === "string"
    && callbackUrl.startsWith("/")
    && !callbackUrl.startsWith("//")
    && !callbackUrl.includes("\\")
    ? callbackUrl
    : "/";
  redirect(destination);
}

export async function doSignOut() {
  await signOut({ redirect: false });
  redirect("/signin");
}
