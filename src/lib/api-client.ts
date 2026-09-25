// Backend base URL. Set VITE_API_URL (e.g. your ngrok / Render URL) to use the real FastAPI backend.
// When empty, the app runs in demo-data mode.
export const API_URL = (import.meta.env["VITE_API_URL"] as string | undefined)?.replace(/\/$/, "") ?? "";
export const DEMO_MODE = !API_URL;

const ACCESS = "sw_access_token";
const REFRESH = "sw_refresh_token";

export const tokens = {
  get access() {
    return typeof window === "undefined" ? null : localStorage.getItem(ACCESS);
  },
  get refresh() {
    return typeof window === "undefined" ? null : localStorage.getItem(REFRESH);
  },
  set(access: string, refresh?: string) {
    localStorage.setItem(ACCESS, access);
    if (refresh) localStorage.setItem(REFRESH, refresh);
  },
  clear() {
    localStorage.removeItem(ACCESS);
    localStorage.removeItem(REFRESH);
  },
};

export class ApiError extends Error {}

function extractMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object") return fallback;
  const b = body as Record<string, unknown>;
  if (typeof b["error"] === "string") return b["error"].trim();
  if (typeof b["message"] === "string") return b["message"];
  if (typeof b["detail"] === "string") return b["detail"];
  if (Array.isArray(b["detail"]) && b["detail"][0]?.msg) return String(b["detail"][0].msg).replace(/^Value error, /, "");
  return fallback;
}

function onAuthFail() {
  tokens.clear();
  if (typeof window !== "undefined" && !location.pathname.startsWith("/auth")) location.href = "/auth";
}

async function tryRefresh(): Promise<boolean> {
  const rt = tokens.refresh;
  if (!rt) return false;
  const res = await fetch(`${API_URL}/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: rt }),
  }).catch(() => null);
  if (!res?.ok) return false;
  const data = await res.json();
  if (!data.access_token) return false;
  tokens.set(data.access_token, data.refresh_token);
  return true;
}

export async function apiFetch<T = unknown>(
  path: string,
  init: RequestInit & { json?: unknown; auth?: boolean } = {},
  retried = false,
): Promise<T> {
  const { json, auth = true, ...rest } = init;
  const headers = new Headers(rest.headers);
  if (json !== undefined) headers.set("Content-Type", "application/json");
  if (auth && tokens.access) headers.set("Authorization", `Bearer ${tokens.access}`);
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...rest, headers, body: json !== undefined ? JSON.stringify(json) : (rest.body ?? null) });
  } catch {
    throw new ApiError("Server se connect nahi ho paaya. Backend chalu hai?");
  }
  if (res.status === 401 && auth) {
    if (!retried && (await tryRefresh())) return apiFetch<T>(path, init, true);
    onAuthFail();
    throw new ApiError("Session expire ho gaya, dobara login karein.");
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(extractMessage(body, `Request failed (${res.status})`));
  // Backend returns {"error": "..."} with 200 for some friend errors
  if (body && typeof body === "object" && "error" in body) throw new ApiError(extractMessage(body, "Error"));
  return body as T;
}
