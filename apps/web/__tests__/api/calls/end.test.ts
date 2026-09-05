import { describe, it, expect, vi, beforeEach } from "vitest";
import { PUT } from "../../../app/api/calls/[id]/end/route";

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

vi.mock("livekit-server-sdk", () => {
  // app/lib/livekit.ts constructs this at module load, so the mock must
  // provide it or importing the route throws before any test body runs.
  // The spies live in the factory (vi.mock is hoisted) and are shared across
  // instances so assertions can reach the module-level client's calls.
  const createRoom = vi.fn();
  const deleteRoom = vi.fn();
  return {
    __spies: { createRoom, deleteRoom },
    RoomServiceClient: class {
      createRoom = createRoom;
      deleteRoom = deleteRoom;
    },
    AccessToken: class {
      addGrant = vi.fn();
      toJwt = vi.fn().mockResolvedValue("mock-server-token");
    },
  };
});

const { __spies } = (await import("livekit-server-sdk")) as unknown as {
  __spies: { createRoom: ReturnType<typeof vi.fn>; deleteRoom: ReturnType<typeof vi.fn> };
};

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { getServerSession } from "next-auth";

const mockCallRoom = {
  id: "call-1",
  livekitRoom: "call-room-name",
  type: "VIDEO",
  status: "ONGOING",
  initiatorId: "user-1",
  groupId: null,
  startedAt: new Date(),
  endedAt: null,
  // The route authorizes via callRoom.participants; without this the
  // fixture triggers a TypeError before any assertion is reached.
  participants: [
    { userId: "user-1", callId: "call-1" },
    { userId: "user-2", callId: "call-1" },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockResolvedValue({ ok: true });
  mockPrisma.callRoom.findUnique.mockResolvedValue(mockCallRoom);
  mockPrisma.callRoom.update.mockResolvedValue({ ...mockCallRoom, status: "ENDED", endedAt: new Date() });
});

describe("PUT /api/calls/[id]/end", () => {
  function makeRequest(id: string): Request {
    return new Request(`http://localhost:3000/api/calls/${id}/end`, { method: "PUT" });
  }

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const res = await PUT(makeRequest("call-1"), { params: { id: "call-1" } });
    expect(res.status).toBe(401);
  });

  it("returns 404 when call not found", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "user-1" } });
    mockPrisma.callRoom.findUnique.mockResolvedValue(null);
    const res = await PUT(makeRequest("call-1"), { params: { id: "call-1" } });
    const json = await res.json();
    expect(res.status).toBe(404);
    expect(json.error).toBe("Call not found");
  });

  it("returns 200 and sets status to ENDED", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "user-1" } });
    const res = await PUT(makeRequest("call-1"), { params: { id: "call-1" } });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.message).toBe("Call ended");
    expect(mockPrisma.callRoom.update).toHaveBeenCalledWith({
      where: { id: "call-1" },
      data: { status: "ENDED", endedAt: expect.any(Date) },
    });
  });

  it("cleans up LiveKit room on end", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "user-1" } });
    await PUT(makeRequest("call-1"), { params: { id: "call-1" } });
    expect(__spies.deleteRoom).toHaveBeenCalledWith("call-room-name");
  });
});
