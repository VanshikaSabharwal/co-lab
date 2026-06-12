import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../../../app/api/calls/livekit-webhook/route";

const mockPrisma = vi.hoisted(() => ({
  callRoom: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  callParticipant: {
    updateMany: vi.fn(),
  },
}));

vi.mock("@prisma/client", () => ({
  PrismaClient: class {
    constructor() {
      return mockPrisma;
    }
  },
}));

const mockCallRoom = {
  id: "call-1",
  livekitRoom: "test-room",
  type: "VIDEO",
  status: "ONGOING",
  initiatorId: "user-1",
  groupId: null,
  startedAt: new Date(),
  endedAt: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.callRoom.findUnique.mockResolvedValue(mockCallRoom);
});

describe("POST /api/calls/livekit-webhook", () => {
  function makeWebhook(body: Record<string, unknown>): Request {
    return new Request("http://localhost:3000/api/calls/livekit-webhook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("returns 400 when event is missing", async () => {
    const res = await POST(makeWebhook({ room: { name: "test-room" } }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when room is missing", async () => {
    const res = await POST(makeWebhook({ event: "participant_joined" }));
    expect(res.status).toBe(400);
  });

  it("returns 404 when call room not found", async () => {
    mockPrisma.callRoom.findUnique.mockResolvedValue(null);
    const res = await POST(makeWebhook({
      event: "participant_joined",
      room: { name: "unknown-room" },
    }));
    expect(res.status).toBe(404);
  });

  it("handles participant_joined event", async () => {
    const res = await POST(makeWebhook({
      event: "participant_joined",
      room: { name: "test-room" },
      participant: { identity: "user-2" },
    }));
    expect(res.status).toBe(200);
    expect(mockPrisma.callParticipant.updateMany).toHaveBeenCalledWith({
      where: { callId: "call-1", userId: "user-2" },
      data: { joinedAt: expect.any(Date) },
    });
  });

  it("handles participant_joined without participant info", async () => {
    const res = await POST(makeWebhook({
      event: "participant_joined",
      room: { name: "test-room" },
    }));
    expect(res.status).toBe(200);
  });

  it("handles participant_left event", async () => {
    const res = await POST(makeWebhook({
      event: "participant_left",
      room: { name: "test-room" },
      participant: { identity: "user-2" },
    }));
    expect(res.status).toBe(200);
    expect(mockPrisma.callParticipant.updateMany).toHaveBeenCalledWith({
      where: { callId: "call-1", userId: "user-2" },
      data: { leftAt: expect.any(Date) },
    });
  });

  it("handles room_finished event", async () => {
    const res = await POST(makeWebhook({
      event: "room_finished",
      room: { name: "test-room" },
    }));
    expect(res.status).toBe(200);
    expect(mockPrisma.callRoom.update).toHaveBeenCalledWith({
      where: { id: "call-1" },
      data: { status: "ENDED", endedAt: expect.any(Date) },
    });
  });

  it("does not override ENDED status on room_finished", async () => {
    mockPrisma.callRoom.findUnique.mockResolvedValue({ ...mockCallRoom, status: "ENDED" });
    const res = await POST(makeWebhook({
      event: "room_finished",
      room: { name: "test-room" },
    }));
    expect(res.status).toBe(200);
    expect(mockPrisma.callRoom.update).not.toHaveBeenCalled();
  });
});
