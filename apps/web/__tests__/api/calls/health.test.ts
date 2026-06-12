import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../../../app/api/calls/health/route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

import { getServerSession } from "next-auth";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockResolvedValue({ ok: true });
});

describe("GET /api/calls/health", () => {
  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 200 with health info when LiveKit is reachable", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "user-1" } });
    const res = await GET();
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.server).toBe("ok");
    expect(json.livekit).toBe("reachable");
    expect(json.hasApiKey).toBe(true);
    expect(json.hasApiSecret).toBe(true);
  });

  it("returns 503 when LiveKit is unreachable", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "user-1" } });
    mockFetch.mockRejectedValue(new Error("Connection refused"));
    const res = await GET();
    const json = await res.json();
    expect(res.status).toBe(503);
    expect(json.livekit).toBe("unreachable");
  });

  it("reports livekitHost and livekitUrl in response", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "user-1" } });
    const res = await GET();
    const json = await res.json();
    expect(json.livekitHost).toBe("http://localhost:7880");
    expect(json.livekitUrl).toBe("ws://localhost:7880");
  });
});
