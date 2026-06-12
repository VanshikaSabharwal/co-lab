import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../../../app/api/calls/push-subscribe/route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

const mockPrisma = vi.hoisted(() => ({
  pushSubscription: {
    upsert: vi.fn(),
  },
}));

vi.mock("@prisma/client", () => ({
  PrismaClient: class {
    constructor() {
      return mockPrisma;
    }
  },
}));

import { getServerSession } from "next-auth";

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.pushSubscription.upsert.mockResolvedValue({
    id: "sub-1",
    userId: "user-1",
    endpoint: "https://example.com/push",
    p256dh: "key123",
    auth: "auth456",
    createdAt: new Date(),
  });
});

describe("POST /api/calls/push-subscribe", () => {
  const validBody = {
    endpoint: "https://example.com/push",
    p256dh: "base64-public-key",
    auth: "base64-auth-secret",
  };

  function makeRequest(body: Record<string, unknown>): Request {
    return new Request("http://localhost:3000/api/calls/push-subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(401);
  });

  it("returns 400 when endpoint is missing", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "user-1" } });
    const res = await POST(makeRequest({ p256dh: "key", auth: "auth" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when p256dh is missing", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "user-1" } });
    const res = await POST(makeRequest({ endpoint: "https://example.com/push", auth: "auth" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when auth is missing", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "user-1" } });
    const res = await POST(makeRequest({ endpoint: "https://example.com/push", p256dh: "key" }));
    expect(res.status).toBe(400);
  });

  it("returns 200 and upserts subscription", async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { id: "user-1" } });
    const res = await POST(makeRequest(validBody));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.message).toBe("Subscribed");
    expect(mockPrisma.pushSubscription.upsert).toHaveBeenCalledWith({
      where: { userId_endpoint: { userId: "user-1", endpoint: validBody.endpoint } },
      update: { p256dh: validBody.p256dh, auth: validBody.auth },
      create: { userId: "user-1", endpoint: validBody.endpoint, p256dh: validBody.p256dh, auth: validBody.auth },
    });
  });
});
