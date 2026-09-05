import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createLiveKitToken,
  ensureLiveKitRoom,
  deleteLiveKitRoom,
} from "../../../app/lib/livekit";

// vi.mock is hoisted above the imports, so the spies have to be created inside
// the factory and read back afterwards — a top-level const would still be in
// its temporal dead zone when app/lib/livekit.ts constructs its client.
vi.mock("livekit-server-sdk", () => {
  const createRoom = vi.fn();
  const deleteRoom = vi.fn();
  const addGrant = vi.fn();
  const toJwt = vi.fn();
  return {
    // Shared across instances so assertions can reach the module-level client.
    __spies: { createRoom, deleteRoom, addGrant, toJwt },
    RoomServiceClient: class {
      createRoom = createRoom;
      deleteRoom = deleteRoom;
    },
    AccessToken: class {
      addGrant = addGrant;
      toJwt = toJwt;
    },
  };
});

const { __spies } = (await import("livekit-server-sdk")) as unknown as {
  __spies: {
    createRoom: ReturnType<typeof vi.fn>;
    deleteRoom: ReturnType<typeof vi.fn>;
    addGrant: ReturnType<typeof vi.fn>;
    toJwt: ReturnType<typeof vi.fn>;
  };
};
const { createRoom, deleteRoom, addGrant, toJwt } = __spies;

beforeEach(() => {
  vi.clearAllMocks();
  createRoom.mockResolvedValue({ name: "test-room" });
  deleteRoom.mockResolvedValue(undefined);
  toJwt.mockResolvedValue("mock-token");
});

describe("createLiveKitToken", () => {
  it("returns a JWT string", async () => {
    await expect(createLiveKitToken("user-1", "test-room")).resolves.toBe("mock-token");
  });

  it("grants publish rights by default", async () => {
    await createLiveKitToken("user-1", "test-room");
    expect(addGrant).toHaveBeenCalledWith(
      expect.objectContaining({ room: "test-room", roomJoin: true, canPublish: true }),
    );
  });

  it("can issue a subscribe-only token", async () => {
    await createLiveKitToken("user-1", "test-room", false);
    expect(addGrant).toHaveBeenCalledWith(
      expect.objectContaining({ canPublish: false, canSubscribe: true }),
    );
  });
});

describe("ensureLiveKitRoom", () => {
  it("creates the room with an empty timeout", async () => {
    await ensureLiveKitRoom("test-room");
    expect(createRoom).toHaveBeenCalledWith(
      expect.objectContaining({ name: "test-room", emptyTimeout: 300 }),
    );
  });

  it("swallows 409 — the room already existing is the expected race", async () => {
    createRoom.mockRejectedValue(Object.assign(new Error("Conflict"), { status: 409 }));
    await expect(ensureLiveKitRoom("test-room")).resolves.toBeUndefined();
  });

  it("rethrows anything that is not a 409", async () => {
    createRoom.mockRejectedValue(Object.assign(new Error("Server Error"), { status: 500 }));
    await expect(ensureLiveKitRoom("test-room")).rejects.toThrow("Server Error");
  });
});

describe("deleteLiveKitRoom", () => {
  it("deletes the named room", async () => {
    await deleteLiveKitRoom("test-room");
    expect(deleteRoom).toHaveBeenCalledWith("test-room");
  });

  it("never throws — cleanup failure must not break call teardown", async () => {
    deleteRoom.mockRejectedValue(new Error("boom"));
    await expect(deleteLiveKitRoom("test-room")).resolves.toBeUndefined();
  });
});
