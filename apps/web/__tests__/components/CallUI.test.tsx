import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

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
    localParticipant: {
      setMicrophoneEnabled: vi.fn(),
      setCameraEnabled: vi.fn(),
      setScreenShareEnabled: vi.fn(),
    },
  })),
  RoomEvent: {
    ParticipantConnected: "participantConnected",
    ParticipantDisconnected: "participantDisconnected",
    Disconnected: "disconnected",
    MediaDevicesError: "mediaDevicesError",
  },
  Track: { Kind: { Video: "video", Audio: "audio" } },
  createLocalVideoTrack: vi.fn(),
}));

import { CallProvider, useCall } from "../../app/components/call/CallProvider";
import CallUI from "../../app/components/call/CallUI";

function CallControlButtons() {
  const { initiateCall, incomingCall, acceptCall, rejectCall } = useCall();
  return (
    <div>
      <button data-testid="start-video-call" onClick={() => initiateCall("VIDEO", "user-2")}>
        Start Video Call
      </button>
      <button data-testid="start-audio-call" onClick={() => initiateCall("AUDIO", "user-2")}>
        Start Audio Call
      </button>
      <span data-testid="incoming-call-info">
        {incomingCall ? `${incomingCall.callerName}-${incomingCall.type}` : "none"}
      </span>
      {incomingCall && (
        <>
          <button data-testid="accept-video-call" onClick={() => acceptCall(incomingCall.callId)}>
            Accept Video
          </button>
          <button data-testid="reject-call" onClick={() => rejectCall(incomingCall.callId)}>
            Reject
          </button>
        </>
      )}
    </div>
  );
}

function renderWithProvider(ui: React.ReactElement) {
  return render(
    <CallProvider>
      {ui}
      <CallUI />
    </CallProvider>,
  );
}

describe("CallUI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when no call is active", () => {
    renderWithProvider(<CallControlButtons />);
    expect(screen.getByTestId("incoming-call-info").textContent).toBe("none");
  });

  it("shows IncomingCallModal when incoming call is set", () => {
    function Setter() {
      const { setIncomingCall } = useCall();
      return (
        <button
          data-testid="trigger-incoming"
          onClick={() =>
            setIncomingCall({
              callId: "call-1",
              roomName: "room-1",
              callerId: "user-1",
              callerName: "Alice",
              type: "VIDEO",
            })
          }
        >
          Trigger
        </button>
      );
    }
    renderWithProvider(<Setter />);
    fireEvent.click(screen.getByTestId("trigger-incoming"));
    expect(screen.getByText("Alice")).toBeTruthy();
    expect(screen.getByText("Video call incoming...")).toBeTruthy();
  });

  it("renders accept and reject buttons for incoming call", () => {
    function Setter() {
      const { setIncomingCall } = useCall();
      return (
        <button
          data-testid="trigger-incoming"
          onClick={() =>
            setIncomingCall({
              callId: "call-1",
              roomName: "room-1",
              callerId: "user-1",
              callerName: "Bob",
              type: "AUDIO",
            })
          }
        >
          Trigger
        </button>
      );
    }
    renderWithProvider(<Setter />);
    fireEvent.click(screen.getByTestId("trigger-incoming"));
    expect(screen.getByText("Bob")).toBeTruthy();
    expect(screen.getByText("Audio call incoming...")).toBeTruthy();
    expect(screen.getByText("Reject")).toBeTruthy();
    expect(screen.getByText("Accept Audio")).toBeTruthy();
  });

  it("shows ActiveCallBar when active call is set", () => {
    function Setter() {
      const { setActiveCall } = useCall();
      return (
        <button
          data-testid="set-active"
          onClick={() =>
            setActiveCall({
              callId: "call-1",
              roomName: "room-1",
              type: "VIDEO",
              token: "token-1",
              room: null,
            })
          }
        >
          Start
        </button>
      );
    }
    renderWithProvider(<Setter />);
    fireEvent.click(screen.getByTestId("set-active"));
    expect(screen.getByText(/Video Call/)).toBeTruthy();
  });

  it("can end an active call", () => {
    function Setter() {
      const { setActiveCall, activeCall } = useCall();
      return (
        <div>
          <button
            data-testid="set-active"
            onClick={() =>
              setActiveCall({
                callId: "call-1",
                roomName: "room-1",
                type: "AUDIO",
                token: "token-1",
                room: null,
              })
            }
          >
            Start
          </button>
          <span data-testid="has-active">{String(!!activeCall)}</span>
        </div>
      );
    }
    renderWithProvider(<Setter />);
    fireEvent.click(screen.getByTestId("set-active"));
    expect(screen.getByTestId("has-active").textContent).toBe("true");
    fireEvent.click(screen.getByText(/End/));
  });

  it("can minimize and expand an active call", () => {
    function Setter() {
      const { setActiveCall } = useCall();
      return (
        <button
          data-testid="set-active"
          onClick={() =>
            setActiveCall({
              callId: "call-1",
              roomName: "room-1",
              type: "VIDEO",
              token: "token-1",
              room: null,
            })
          }
        >
          Start
        </button>
      );
    }
    renderWithProvider(<Setter />);
    fireEvent.click(screen.getByTestId("set-active"));

    // CallUI auto-expands when a call becomes active, so the panel — not the
    // minimized bar — is what shows first.
    fireEvent.click(screen.getByTitle("Minimize"));

    // Now the compact bar is showing.
    const expandBtn = screen.getByTitle("Expand call");
    expect(expandBtn).toBeTruthy();

    // And expanding returns to the full panel.
    fireEvent.click(expandBtn);
    expect(screen.getByTitle("Minimize")).toBeTruthy();
  });

  it("rejects incoming call and clears it", () => {
    function Setter() {
      const { setIncomingCall } = useCall();
      return (
        <button
          data-testid="trigger-incoming"
          onClick={() =>
            setIncomingCall({
              callId: "call-1",
              roomName: "room-1",
              callerId: "user-1",
              callerName: "Charlie",
              type: "VIDEO",
            })
          }
        >
          Trigger
        </button>
      );
    }
    renderWithProvider(<Setter />);
    fireEvent.click(screen.getByTestId("trigger-incoming"));
    expect(screen.getByText("Charlie")).toBeTruthy();

    // Mock the API call for reject
    global.fetch = vi.fn().mockResolvedValue({ ok: true });

    fireEvent.click(screen.getByText("Reject"));
  });
});
