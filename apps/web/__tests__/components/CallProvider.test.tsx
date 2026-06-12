import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(() => ({
    data: { user: { id: "test-user-id", name: "Test User" } },
    status: "authenticated",
  })),
  SessionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("livekit-client", () => ({
  Room: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    remoteParticipants: new Map(),
    localParticipant: { setMicrophoneEnabled: vi.fn(), setCameraEnabled: vi.fn() },
  })),
  RoomEvent: {
    ParticipantConnected: "participantConnected",
    ParticipantDisconnected: "participantDisconnected",
    TrackSubscribed: "trackSubscribed",
    TrackUnsubscribed: "trackUnsubscribed",
    Disconnected: "disconnected",
    MediaDevicesError: "mediaDevicesError",
  },
  Track: {
    Source: { Camera: "camera", Microphone: "microphone", ScreenShare: "screenShare" },
  },
}));

import { CallProvider, useCall } from "../../app/components/call/CallProvider";

function TestConsumer() {
  const ctx = useCall();
  return (
    <div>
      <span data-testid="has-incoming">{String(!!ctx.incomingCall)}</span>
      <span data-testid="has-active">{String(!!ctx.activeCall)}</span>
      <span data-testid="is-calling">{String(ctx.isCalling)}</span>
      <button data-testid="initiate-call" onClick={() => ctx.initiateCall("VIDEO", "user-2")}>
        Initiate
      </button>
    </div>
  );
}

describe("CallProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders without crashing", () => {
    render(
      <CallProvider>
        <div data-testid="child">Hello</div>
      </CallProvider>,
    );
    expect(screen.getByTestId("child")).toBeTruthy();
  });

  it("provides call context with default values", () => {
    render(
      <CallProvider>
        <TestConsumer />
      </CallProvider>,
    );
    expect(screen.getByTestId("has-incoming").textContent).toBe("false");
    expect(screen.getByTestId("has-active").textContent).toBe("false");
    expect(screen.getByTestId("is-calling").textContent).toBe("false");
  });

  it("throws error when useCall is used outside provider", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow("useCall must be used within CallProvider");
    consoleSpy.mockRestore();
  });
});
