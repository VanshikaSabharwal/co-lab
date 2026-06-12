import { describe, it, expect, vi } from "vitest";

describe("Environment Variable Validation", () => {
  const requiredVars = ["LIVEKIT_API_KEY", "LIVEKIT_API_SECRET", "LIVEKIT_HOST", "NEXT_PUBLIC_LIVEKIT_URL"];

  for (const varName of requiredVars) {
    it(`${varName} is set in test environment`, () => {
      expect(process.env[varName]).toBeTruthy();
    });
  }

  it("LIVEKIT_HOST has valid HTTP URL format", () => {
    const url = process.env.LIVEKIT_HOST || "";
    expect(url.startsWith("http://") || url.startsWith("https://")).toBe(true);
  });

  it("NEXT_PUBLIC_LIVEKIT_URL has valid WebSocket URL format", () => {
    const url = process.env.NEXT_PUBLIC_LIVEKIT_URL || "";
    expect(url.startsWith("ws://") || url.startsWith("wss://")).toBe(true);
  });
});
