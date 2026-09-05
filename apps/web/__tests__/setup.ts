import "@testing-library/jest-dom";
import { vi } from "vitest";

// jsdom implements no Web Audio API, but IncomingCallModal builds its ringtone
// with one — without this stub the component throws on render and every test
// touching it fails.
class MockAudioContext {
  currentTime = 0;
  destination = {};
  state = "running";
  createOscillator() {
    return {
      type: "sine",
      frequency: { setValueAtTime: vi.fn(), value: 0 },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      disconnect: vi.fn(),
    };
  }
  createGain() {
    return {
      gain: { setValueAtTime: vi.fn(), value: 0, linearRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
      disconnect: vi.fn(),
    };
  }
  close() {
    return Promise.resolve();
  }
  resume() {
    return Promise.resolve();
  }
}

vi.stubGlobal("AudioContext", MockAudioContext);
// Safari's prefixed name, which the ringtone code may fall back to.
vi.stubGlobal("webkitAudioContext", MockAudioContext);

process.env.LIVEKIT_API_KEY = "test-devkey";
process.env.LIVEKIT_API_SECRET = "test-devsecret";
process.env.LIVEKIT_HOST = "http://localhost:7880";
process.env.NEXT_PUBLIC_LIVEKIT_URL = "ws://localhost:7880";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
