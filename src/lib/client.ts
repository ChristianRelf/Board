"use client";

import { toast } from "sonner";

/**
 * Per-tab id so the SSE stream can skip echoes of our own writes.
 * randomUUID only exists in secure contexts, so keep a plain fallback.
 */
export const CLIENT_ID =
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;

async function send<T>(method: string, url: string, body?: unknown): Promise<T> {
  const isForm = body instanceof FormData;
  const res = await fetch(url, {
    method,
    headers: {
      "x-client-id": CLIENT_ID,
      ...(body && !isForm ? { "content-type": "application/json" } : {}),
    },
    body: isForm ? body : body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const msg = await res
      .json()
      .then((j) => j.error as string)
      .catch(() => res.statusText);
    throw new Error(msg || "Request failed");
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

export const api = {
  get: <T>(url: string) => send<T>("GET", url),
  post: <T>(url: string, body?: unknown) => send<T>("POST", url, body),
  patch: <T>(url: string, body?: unknown) => send<T>("PATCH", url, body),
  del: <T>(url: string, body?: unknown) => send<T>("DELETE", url, body),
};

/** Fire-and-forget with a toast on failure — used by optimistic mutations. */
export function bg<T>(p: Promise<T>, onError?: () => void) {
  p.catch((e: Error) => {
    toast.error(e.message);
    onError?.();
  });
  return p;
}

export function newId() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
    (Number(c) ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (Number(c) / 4)))).toString(16));
}
