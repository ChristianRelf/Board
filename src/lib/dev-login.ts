import "server-only";

export const devLoginEnabled = process.env.NODE_ENV === "development";

// Share the cookie settings with Auth.js so local HTTP and LAN previews work.
export const devSessionCookie = {
  name: "authjs.session-token",
  options: {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: false,
  },
};
