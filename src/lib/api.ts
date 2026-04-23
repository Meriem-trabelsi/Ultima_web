import { getToken } from "@/lib/session";

type RequestOptions = RequestInit & {
  authenticated?: boolean;
};

export async function api<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  if (options.authenticated) {
    const token = getToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const response = await fetch(url, {
    ...options,
    body: (options.body && typeof options.body === "object" && !(options.body instanceof FormData))
        ? JSON.stringify(options.body)
        : options.body,
    headers,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message ?? "Une erreur est survenue.");
  }

  return payload as T;
}
