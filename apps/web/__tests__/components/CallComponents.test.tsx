import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("next-auth/react", () => ({
  useSession: vi.fn(() => ({
    data: { user: { id: "test-id", name: "Test User" } },
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
  Track: {
    Kind: { Video: "video", Audio: "audio" },
    Source: { Camera: "camera", Microphone: "microphone", ScreenShare: "screenShare" },
  },
}));

import IncomingCallModal from "../../app/components/call/IncomingCallModal";
import ActiveCallBar from "../../app/components/call/ActiveCallBar";
import CallControls from "../../app/components/call/CallControls";
import VideoTile from "../../app/components/call/VideoTile";
import VideoGrid from "../../app/components/call/VideoGrid";
import ParticipantList from "../../app/components/call/ParticipantList";
import { CallProvider } from "../../app/components/call/CallProvider";

describe("IncomingCallModal", () => {
  it("renders null when no incoming call", () => {
    const { container } = render(
      <CallProvider>
        <IncomingCallModal />
      </CallProvider>,
    );
    expect(container.innerHTML).toBe("");
  });
});

describe("ActiveCallBar", () => {
  it("renders null when no active call", () => {
    const { container } = render(
      <CallProvider>
        <ActiveCallBar onExpand={vi.fn()} />
      </CallProvider>,
    );
    expect(container.innerHTML).toBe("");
  });
});

describe("CallControls", () => {
  const defaultProps = {
    muted: false,
    videoEnabled: true,
    screenSharing: false,
    participantListOpen: false,
    onToggleMute: vi.fn(),
    onToggleVideo: vi.fn(),
    onToggleScreenShare: vi.fn(),
    onToggleParticipantList: vi.fn(),
    onEndCall: vi.fn(),
  };

  it("renders all control buttons", () => {
    render(<CallControls {...defaultProps} />);
    expect(screen.getByTitle("Mute")).toBeTruthy();
    expect(screen.getByTitle("Video On")).toBeTruthy();
    expect(screen.getByTitle("Share Screen")).toBeTruthy();
    expect(screen.getByTitle("Participants")).toBeTruthy();
    expect(screen.getByText("End Call")).toBeTruthy();
  });

  it("shows mute variant when muted", () => {
    render(<CallControls {...defaultProps} muted={true} />);
    expect(screen.getByTitle("Unmute")).toBeTruthy();
  });

  it("shows video off variant when video disabled", () => {
    render(<CallControls {...defaultProps} videoEnabled={false} />);
    expect(screen.getByTitle("Video Off")).toBeTruthy();
  });

  it("shows stop share when screen sharing", () => {
    render(<CallControls {...defaultProps} screenSharing={true} />);
    expect(screen.getByTitle("Stop Share")).toBeTruthy();
  });

  it("calls onToggleMute when clicked", () => {
    const onToggleMute = vi.fn();
    render(<CallControls {...defaultProps} onToggleMute={onToggleMute} />);
    fireEvent.click(screen.getByTitle("Mute"));
    expect(onToggleMute).toHaveBeenCalledOnce();
  });

  it("calls onEndCall when end call button clicked", () => {
    const onEndCall = vi.fn();
    render(<CallControls {...defaultProps} onEndCall={onEndCall} />);
    fireEvent.click(screen.getByText("End Call"));
    expect(onEndCall).toHaveBeenCalledOnce();
  });

  it("calls onToggleScreenShare when clicked", () => {
    const onToggleScreenShare = vi.fn();
    render(<CallControls {...defaultProps} onToggleScreenShare={onToggleScreenShare} />);
    fireEvent.click(screen.getByTitle("Share Screen"));
    expect(onToggleScreenShare).toHaveBeenCalledOnce();
  });
});

describe("VideoTile", () => {
  const mockParticipant = {
    sid: "participant-1",
    identity: "user-1",
    name: "Test User",
    isSpeaking: false,
    isMicrophoneEnabled: true,
    isCameraEnabled: false,
    trackPublications: {
      forEach: vi.fn((cb) => {
        // simulate tracks
      }),
    },
  };

  it("renders with participant name", () => {
    const { container } = render(<VideoTile participant={mockParticipant as any} />);
    expect(container.textContent).toContain("Test User");
  });

  it("shows local label when isLocal", () => {
    const { container } = render(<VideoTile participant={mockParticipant as any} isLocal={true} />);
    expect(container.textContent).toContain("(You)");
  });

  it("shows avatar fallback when camera is off", () => {
    const { container } = render(<VideoTile participant={mockParticipant as any} />);
    expect(container.innerHTML).not.toContain("<video");
  });
});

describe("VideoGrid", () => {
  it("shows empty state message when no participants", () => {
    render(<VideoGrid participants={[]} />);
    expect(screen.getByText("No participants yet")).toBeTruthy();
  });
});

describe("ParticipantList", () => {
  const mockParticipants = [
    {
      sid: "p1",
      identity: "user-1",
      name: "Alice",
      isSpeaking: false,
      isMicrophoneEnabled: true,
    },
    {
      sid: "p2",
      identity: "user-2",
      name: "Bob",
      isSpeaking: true,
      isMicrophoneEnabled: false,
    },
  ];

  it("renders participant names", () => {
    render(<ParticipantList participants={mockParticipants as any[]} />);
    expect(screen.getByText("Alice")).toBeTruthy();
    expect(screen.getByText("Bob")).toBeTruthy();
  });

  it("shows speaking indicator", () => {
    const { container } = render(<ParticipantList participants={mockParticipants as any[]} />);
    const greenDots = container.querySelectorAll(".bg-green-400");
    expect(greenDots.length).toBe(1);
  });

  it("shows mute indicator for muted participants", () => {
    const { container } = render(<ParticipantList participants={mockParticipants as any[]} />);
    const muteIcons = container.querySelectorAll(".lucide-mic-off");
    expect(muteIcons.length).toBe(1);
  });

  it("shows count", () => {
    render(<ParticipantList participants={mockParticipants as any[]} />);
    expect(screen.getByText(/Participants \(2\)/)).toBeTruthy();
  });
});
