import { describe, it, expect, vi, beforeEach } from "vitest";
import { PUT } from "../../../app/api/calls/[id]/reject/route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

const mockPrisma = vi.hoisted(() => ({
  callRoom: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@prisma/client", () => ({
  PrismaClient: class {
    constructor() {
      return mockPrisma;
    }
  },
}));

vi.mock("livekit-server-sdk", () => ({
  AccessToken: class {
    addGrant = vi.fn();
    toJwt = vi.fn().mockReturnValue("mock-server-token");
  },
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { getServerSession } from "next-auth";

const mockCallRoom = {
  id: "call-1",
  livekitRoom: "call-room-name",
  type: "VIDEO",
  status: "RINGING",
  initiatorId: "user-1",
  groupId: null,
  startedAt: new Date(),
  endedAt: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockResolvedValue({ ok: true });
  mockPrisma.callRoom.findUnique.mockResolvedValue(mockCallRoom);
  mockPrisma.callRoom.update.mockResolvedValue({ ...mockCallRoom, status: "REJECTED" });
});

describe("PUT /api/calls/[id]/reject", () => {
  function makeRequest(id: string): Request {
    return new Request(`http://localhost:3000/api/calls/${id}/reject`, { method: "PUT" });
  }

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const res = await PUT(makeRequest("call-1"), { params: { id: "call-1" } });
    expect(res.status).toBe(401);
  });

  it("returns 404 when call not found", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "user-2" } });
    mockPrisma.callRoom.findUnique.mockResolvedValue(null);
    const res = await PUT(makeRequest("call-1"), { params: { id: "call-1" } });
    const json = await res.json();
    expect(res.status).toBe(404);
    expect(json.error).toBe("Call not found");
  });

  it("returns 400 when call is no longer ringing", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "user-2" } });
    mockPrisma.callRoom.findUnique.mockResolvedValue({ ...mockCallRoom, status: "ONGOING" });
    const res = await PUT(makeRequest("call-1"), { params: { id: "call-1" } });
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toBe("Call is no longer ringing");
  });

  it("returns 200 and sets status to REJECTED", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "user-2" } });
    const res = await PUT(makeRequest("call-1"), { params: { id: "call-1" } });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.message).toBe("Call rejected");
    expect(mockPrisma.callRoom.update).toHaveBeenCalledWith({
      where: { id: "call-1" },
      data: { status: "REJECTED" },
    });
  });

  it("cleans up LiveKit room on reject", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "user-2" } });
    await PUT(makeRequest("call-1"), { params: { id: "call-1" } });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("DeleteRoom"),
      expect.any(Object),
    );
  });
});
