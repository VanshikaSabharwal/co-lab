import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../../../app/api/calls/initiate/route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

const mockPrisma = vi.hoisted(() => ({
  callRoom: {
    create: vi.fn(),
  },
}));

vi.mock("@prisma/client", () => ({
  PrismaClient: class {
    constructor() {
      return mockPrisma;
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

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { getServerSession } from "next-auth";

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockResolvedValue({ ok: true });
  mockPrisma.callRoom.create.mockResolvedValue({
    id: "call-room-id",
    livekitRoom: "call-mock-uuid",
    type: "VIDEO",
    status: "RINGING",
    initiatorId: "user-1",
    groupId: null,
    startedAt: new Date(),
    endedAt: null,
    participants: [
      { id: "p1", userId: "user-1", callId: "call-room-id" },
      { id: "p2", userId: "user-2", callId: "call-room-id" },
    ],
  });
});

describe("POST /api/calls/initiate", () => {
  function makeRequest(body: Record<string, unknown>): Request {
    return new Request("http://localhost:3000/api/calls/initiate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const res = await POST(makeRequest({ type: "VIDEO", targetId: "user-2" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when type is missing", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "user-1" } });
    const res = await POST(makeRequest({ targetId: "user-2" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when targetId and groupId are missing", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "user-1" } });
    const res = await POST(makeRequest({ type: "VIDEO" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid call type", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "user-1" } });
    const res = await POST(makeRequest({ type: "INVALID", targetId: "user-2" }));
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toBe("Invalid call type");
  });

  it("returns 201 for valid 1-on-1 VIDEO call", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "user-1" } });
    const res = await POST(makeRequest({ type: "VIDEO", targetId: "user-2" }));
    const json = await res.json();
    expect(res.status).toBe(201);
    expect(json.callRoom).toBeDefined();
    expect(json.token).toBe("mock-jwt-token");
    expect(json.roomName).toContain("call-");
  });

  it("returns 201 for AUDIO call", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "user-1" } });
    const res = await POST(makeRequest({ type: "AUDIO", targetId: "user-2" }));
    expect(res.status).toBe(201);
  });

  it("returns 201 for GROUP call", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "user-1" } });
    const res = await POST(makeRequest({ type: "GROUP", groupId: "group-1" }));
    expect(res.status).toBe(201);
  });

  it("handles LiveKit room already existing (409)", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "user-1" } });
    mockFetch.mockResolvedValue({ ok: false, status: 409, statusText: "Conflict" });
    const res = await POST(makeRequest({ type: "AUDIO", targetId: "user-2" }));
    expect(res.status).toBe(201);
  });

  it("handles LiveKit server error", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "user-1" } });
    mockFetch.mockResolvedValue({ ok: false, status: 500, statusText: "Server Error" });
    const res = await POST(makeRequest({ type: "VIDEO", targetId: "user-2" }));
    expect(res.status).toBe(500);
  });

  it("handles database errors", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "user-1" } });
    mockPrisma.callRoom.create.mockRejectedValue(new Error("DB error"));
    const res = await POST(makeRequest({ type: "VIDEO", targetId: "user-2" }));
    expect(res.status).toBe(500);
  });
});
