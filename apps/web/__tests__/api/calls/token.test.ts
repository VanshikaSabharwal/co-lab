import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../../../app/api/calls/token/route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@prisma/client", () => ({
  PrismaClient: class {
    constructor() {
      return {};
    }
  },
}));

const mockToJwt = vi.hoisted(() => vi.fn().mockReturnValue("mock-jwt-token"));

vi.mock("livekit-server-sdk", () => ({
  AccessToken: class {
    addGrant = vi.fn();
    toJwt = mockToJwt;
  },
}));

import { getServerSession } from "next-auth";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/calls/token", () => {
  function makeRequest(body: Record<string, unknown>): Request {
    return new Request("http://localhost:3000/api/calls/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const res = await POST(makeRequest({ roomName: "test-room", identity: "user-1" }));
    const json = await res.json();
    expect(res.status).toBe(401);
    expect(json.error).toBe("Unauthorized");
  });

  it("returns 400 when roomName is missing", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "user-1" } });
    const res = await POST(makeRequest({ identity: "user-1" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when identity is missing", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "user-1" } });
    const res = await POST(makeRequest({ roomName: "test-room" }));
    expect(res.status).toBe(400);
  });

  it("returns 403 when identity does not match session", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "user-1" } });
    const res = await POST(makeRequest({ roomName: "test-room", identity: "attacker-id" }));
    const json = await res.json();
    expect(res.status).toBe(403);
    expect(json.error).toBe("Identity mismatch");
  });

  it("returns 200 with token for valid request", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "user-1" } });
    const res = await POST(makeRequest({ roomName: "test-room", identity: "user-1" }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.token).toBe("mock-jwt-token");
  });

  it("handles token generation failure gracefully", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "user-1" } });
    mockToJwt.mockImplementation(() => { throw new Error("LiveKit error"); });
    const res = await POST(makeRequest({ roomName: "test-room", identity: "user-1" }));
    expect(res.status).toBe(500);
  });
});
