// Client-side helper: fetch a short-lived signed token before opening a
// WebSocket connection. The WS server derives the user's identity from it.
export async function fetchWsToken(): Promise<string | null> {
  try {
    const res = await fetch("/api/ws-token");
    if (!res.ok) return null;
    const data = await res.json();
    return data.token ?? null;
  } catch {
    return null;
  }
}
