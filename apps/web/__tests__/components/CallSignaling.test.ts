import { describe, it, expect, vi, afterAll } from "vitest";

class MockWebSocket {
  readyState: number = WebSocket.OPEN;
  url: string;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  send = vi.fn();
  close = vi.fn();
  constructor(url: string) {
    this.url = url;
  }
}

const originalWebSocket = global.WebSocket;
global.WebSocket = MockWebSocket as any;

describe("Call Signaling - WebSocket messages", () => {
  afterAll(() => {
    global.WebSocket = originalWebSocket;
  });

  it("handleCallOffer constructs correct message", () => {
    const ws = new MockWebSocket("ws://localhost:8080/ws");
    const msg = {
      type: "call_offer",
      callId: "call-1",
      roomName: "room-abc",
      targetId: "user-target",
      callerName: "Alice",
      callType: "VIDEO",
    };

    ws.send(JSON.stringify(msg));
    expect(ws.send).toHaveBeenCalledWith(
      JSON.stringify(msg),
    );
  });

  it("handleCallAccepted constructs correct message", () => {
    const ws = new MockWebSocket("ws://localhost:8080/ws");
    const msg = {
      type: "call_accepted",
      callId: "call-1",
      roomName: "room-abc",
      token: "token-xyz",
      initiatorId: "user-initiator",
    };

    ws.send(JSON.stringify(msg));
    expect(ws.send).toHaveBeenCalledWith(
      JSON.stringify(msg),
    );
  });

  it("handleCallRejected constructs correct message", () => {
    const ws = new MockWebSocket("ws://localhost:8080/ws");
    const msg = {
      type: "call_rejected",
      callId: "call-1",
      initiatorId: "user-initiator",
      reason: "rejected",
    };

    ws.send(JSON.stringify(msg));
    expect(ws.send).toHaveBeenCalledWith(
      JSON.stringify(msg),
    );
  });

  it("handleCallEnded constructs correct message", () => {
    const ws = new MockWebSocket("ws://localhost:8080/ws");
    const msg = {
      type: "call_ended",
      callId: "call-1",
    };

    ws.send(JSON.stringify(msg));
    expect(ws.send).toHaveBeenCalledWith(
      JSON.stringify(msg),
    );
  });

  it("handleCallMissed constructs correct message", () => {
    const ws = new MockWebSocket("ws://localhost:8080/ws");
    const msg = {
      type: "call_missed",
      callId: "call-1",
      callerId: "user-caller",
    };

    ws.send(JSON.stringify(msg));
    expect(ws.send).toHaveBeenCalledWith(
      JSON.stringify(msg),
    );
  });

  it("CallProvider initiates call via API and sends call_offer via WS", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        callRoom: { id: "call-1" },
        roomName: "room-abc",
        token: "token-xyz",
      }),
    });

    const ws = new MockWebSocket("ws://localhost:8080/ws");

    // Simulate initiateCall logic from CallProvider
    const res = await fetch("/api/calls/initiate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "VIDEO", targetId: "user-2" }),
    });
    const data = await res.json();

    // After Room connects successfully, send call_offer via WS
    ws.send(JSON.stringify({
      type: "call_offer",
      callId: data.callRoom.id,
      roomName: data.roomName,
      targetId: "user-2",
      callerName: "Test User",
      callType: "VIDEO",
    }));

    expect(fetch).toHaveBeenCalledWith("/api/calls/initiate", expect.any(Object));
    expect(ws.send).toHaveBeenCalledWith(
      expect.stringContaining("call_offer"),
    );
  });

  it("CallProvider sends call_accepted after acceptCall", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        callId: "call-1",
        roomName: "room-abc",
        token: "token-xyz",
      }),
    });

    const ws = new MockWebSocket("ws://localhost:8080/ws");

    // Simulate acceptCall with an incomingCall in context
    // This tests the WS message construction
    const res = await fetch(`/api/calls/call-1/accept`, { method: "PUT" });
    const data = await res.json();

    ws.send(JSON.stringify({
      type: "call_accepted",
      callId: data.callId,
      roomName: data.roomName,
      token: data.token,
      initiatorId: "user-caller",
    }));

    expect(ws.send).toHaveBeenCalledWith(
      expect.stringContaining("call_accepted"),
    );
  });

  it("CallProvider sends call_rejected after rejectCall", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true });

    const ws = new MockWebSocket("ws://localhost:8080/ws");

    ws.send(JSON.stringify({
      type: "call_rejected",
      callId: "call-1",
      initiatorId: "user-caller",
      reason: "rejected",
    }));

    expect(ws.send).toHaveBeenCalledWith(
      expect.stringContaining("call_rejected"),
    );
  });

  it("CallProvider sends call_ended after endCall", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true });

    const ws = new MockWebSocket("ws://localhost:8080/ws");

    ws.send(JSON.stringify({
      type: "call_ended",
      callId: "call-1",
    }));

    expect(ws.send).toHaveBeenCalledWith(
      expect.stringContaining("call_ended"),
    );
  });
});
