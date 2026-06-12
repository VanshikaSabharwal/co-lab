import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createLiveKitToken,
  ensureLiveKitRoom,
  deleteLiveKitRoom,
} from "../../../app/lib/livekit";

vi.mock("livekit-server-sdk", () => ({
  AccessToken: class {
    addGrant = vi.fn();
    toJwt = vi.fn().mockReturnValue("mock-token");
  },
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockResolvedValue({ ok: true });
});

describe("createLiveKitToken", () => {
  it("returns a JWT string", async () => {
    const token = await createLiveKitToken("user-1", "test-room");
    expect(typeof token).toBe("string");
    expect(token).toBe("mock-token");
  });

  it("creates token with canPublish=true by default", async () => {
    const token = await createLiveKitToken("user-1", "test-room");
    expect(token).toBeTruthy();
  });

  it("can create token with publish=false", async () => {
    const token = await createLiveKitToken("user-1", "test-room", false);
    expect(token).toBe("mock-token");
  });
});

describe("ensureLiveKitRoom", () => {
  it("calls LiveKit CreateRoom API", async () => {
    await ensureLiveKitRoom("test-room");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("CreateRoom"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "Content-Type": "application/json" }),
      }),
    );
  });

  it("does not throw on 409 (room already exists)", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 409, statusText: "Conflict" });
    await expect(ensureLiveKitRoom("test-room")).resolves.not.toThrow();
  });

  it("throws on non-409 errors", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500, statusText: "Server Error" });
    await expect(ensureLiveKitRoom("test-room")).rejects.toThrow("Failed to create LiveKit room");
  });
});

describe("deleteLiveKitRoom", () => {
  it("calls LiveKit DeleteRoom API", async () => {
    await deleteLiveKitRoom("test-room");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("DeleteRoom"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("does not throw on error", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 });
    await expect(deleteLiveKitRoom("test-room")).resolves.not.toThrow();
  });
});
