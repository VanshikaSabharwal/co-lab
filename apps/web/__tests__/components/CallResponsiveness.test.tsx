/**
 * Guards the optimistic-UI contract for call actions: the visible state must
 * change on click, not after the network round-trip. These regressed once
 * already — every action awaited its fetch before updating, so Dismiss and End
 * Call visibly lagged behind the click.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(() => ({
    data: { user: { id: "test-user-id", name: "Test User" } },
    status: "authenticated",
  })),
  SessionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("react-hot-toast", () => {
  const toast = Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(() => "toast-id"),
    dismiss: vi.fn(),
  });
  return { default: toast, toast };
});

const mockDisconnect = vi.fn();

vi.mock("livekit-client", () => ({
  Room: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: mockDisconnect,
    on: vi.fn(),
    off: vi.fn(),
    remoteParticipants: new Map(),
    localParticipant: {
      setMicrophoneEnabled: vi.fn().mockResolvedValue(undefined),
      setCameraEnabled: vi.fn().mockResolvedValue(undefined),
      isMicrophoneEnabled: true,
      isCameraEnabled: true,
    },
  })),
  RoomEvent: {
    Reconnecting: "reconnecting",
    Reconnected: "reconnected",
    Disconnected: "disconnected",
    TrackSubscribed: "trackSubscribed",
    TrackUnsubscribed: "trackUnsubscribed",
  },
  Track: { Source: { Camera: "camera", ScreenShare: "screenShare" } },
}));

vi.mock("../../app/lib/wsAuth", () => ({
  fetchWsToken: vi.fn().mockResolvedValue(null),
}));

import { CallProvider, useCall } from "../../app/components/call/CallProvider";
import toast from "react-hot-toast";

/** Resolves only when the test says so, standing in for a slow server. */
function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

function Harness() {
  const ctx = useCall();
  return (
    <div>
      <span data-testid="has-incoming">{String(!!ctx.incomingCall)}</span>
      <span data-testid="has-active">{String(!!ctx.activeCall)}</span>
      <span data-testid="status">{ctx.callStatus}</span>
      <span data-testid="muted">{String(ctx.muted)}</span>
      <button
        data-testid="seed-incoming"
        onClick={() =>
          ctx.setIncomingCall({
            callId: "call-1",
            roomName: "room-1",
            callerId: "caller-1",
            callerName: "Caller",
            type: "VIDEO",
          })
        }
      />
      <button data-testid="reject" onClick={() => ctx.rejectCall("call-1")} />
      <button
        data-testid="seed-active"
        onClick={() =>
          ctx.setActiveCall({
            callId: "call-1",
            roomName: "room-1",
            type: "VIDEO",
            token: "t",
            room: null,
          })
        }
      />
      <button data-testid="end" onClick={() => ctx.endCall()} />
      <button data-testid="initiate" onClick={() => ctx.initiateCall("VIDEO", "user-2")} />
    </div>
  );
}

function setup() {
  render(
    <CallProvider>
      <Harness />
    </CallProvider>,
  );
}

describe("call action responsiveness", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    }) as unknown as typeof fetch;
  });

  it("dismisses an incoming call before the reject request resolves", async () => {
    const pending = deferred<Response>();
    global.fetch = vi.fn(() => pending.promise) as unknown as typeof fetch;

    setup();
    await act(async () => {
      screen.getByTestId("seed-incoming").click();
    });
    expect(screen.getByTestId("has-incoming").textContent).toBe("true");

    // Click, but never let the server answer.
    await act(async () => {
      screen.getByTestId("reject").click();
    });

    expect(screen.getByTestId("has-incoming").textContent).toBe("false");
    expect(global.fetch).toHaveBeenCalled();

    await act(async () => {
      pending.resolve({ ok: true } as Response);
    });
  });

  it("closes the call UI before the end request resolves", async () => {
    setup();
    await act(async () => {
      screen.getByTestId("seed-active").click();
    });
    expect(screen.getByTestId("has-active").textContent).toBe("true");

    const pending = deferred<Response>();
    global.fetch = vi.fn(() => pending.promise) as unknown as typeof fetch;

    await act(async () => {
      screen.getByTestId("end").click();
    });

    expect(screen.getByTestId("has-active").textContent).toBe("false");
    expect(screen.getByTestId("status").textContent).toBe("idle");

    await act(async () => {
      pending.resolve({ ok: true } as Response);
    });
  });

  it("reports a failed call setup instead of failing silently", async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch;

    setup();
    await act(async () => {
      screen.getByTestId("initiate").click();
    });

    expect(toast.error).toHaveBeenCalled();
    // And the UI is released rather than stuck mid-connect.
    expect(screen.getByTestId("status").textContent).toBe("idle");
    expect(screen.getByTestId("has-active").textContent).toBe("false");
  });

  it("ignores a second initiate while one is already in flight", async () => {
    const pending = deferred<Response>();
    global.fetch = vi.fn(() => pending.promise) as unknown as typeof fetch;

    setup();
    await act(async () => {
      screen.getByTestId("initiate").click();
      screen.getByTestId("initiate").click();
    });

    // Only the first click reached the network; the second was refused, so no
    // second Room is built and orphaned.
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1);

    await act(async () => {
      pending.resolve({ ok: false } as Response);
    });
  });
});
