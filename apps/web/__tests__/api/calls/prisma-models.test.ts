import { describe, it, expect, vi } from "vitest";
import fs from "fs";
import path from "path";

describe("Prisma Model Verification", () => {
  const schemaPath = path.resolve(__dirname, "../../../prisma/schema.prisma");
  const schema = fs.readFileSync(schemaPath, "utf-8");

  it("schema file exists", () => {
    expect(fs.existsSync(schemaPath)).toBe(true);
  });

  describe("CallRoom model", () => {
    it("has required fields", () => {
      expect(schema).toContain("model CallRoom");
      expect(schema).toContain("livekitRoom");
      expect(schema).toContain("type");
      expect(schema).toContain("status");
      expect(schema).toContain("initiatorId");
      expect(schema).toContain("startedAt");
    });

    it("has correct relations", () => {
      expect(schema).toContain("participants");
      expect(schema).toContain("recordings");
      expect(schema).toContain("initiator");
    });

    it("has proper indexes", () => {
      expect(schema).toContain("@@index([status])");
      expect(schema).toContain("@@index([groupId])");
      expect(schema).toContain("@@index([livekitRoom])");
    });
  });

  describe("CallParticipant model", () => {
    it("has all required fields", () => {
      expect(schema).toContain("model CallParticipant");
      expect(schema).toContain("callId");
      expect(schema).toContain("userId");
      expect(schema).toContain("joinedAt");
      expect(schema).toContain("isScreenSharing");
      expect(schema).toContain("isMuted");
      expect(schema).toContain("isVideoOff");
    });

    it("has unique constraint on [callId, userId]", () => {
      expect(schema).toContain("@@unique([callId, userId])");
    });
  });

  describe("CallRecording model", () => {
    it("has all required fields", () => {
      expect(schema).toContain("model CallRecording");
      expect(schema).toContain("callId");
      expect(schema).toContain("filePath");
      expect(schema).toContain("resolution");
      expect(schema).toContain("status");
    });
  });

  describe("PushSubscription model", () => {
    it("is defined for push notifications", () => {
      expect(schema).toContain("model PushSubscription");
      expect(schema).toContain("endpoint");
      expect(schema).toContain("p256dh");
      expect(schema).toContain("auth");
    });
  });

  describe("Enums", () => {
    it("defines CallStatus enum", () => {
      expect(schema).toContain("enum CallStatus");
      expect(schema).toContain("RINGING");
      expect(schema).toContain("ONGOING");
      expect(schema).toContain("ENDED");
    });

    it("defines CallType enum", () => {
      expect(schema).toContain("enum CallType");
      expect(schema).toContain("AUDIO");
      expect(schema).toContain("VIDEO");
      expect(schema).toContain("GROUP");
    });

    it("defines RecordingStatus enum", () => {
      expect(schema).toContain("enum RecordingStatus");
      expect(schema).toContain("RECORDING");
      expect(schema).toContain("COMPLETED");
      expect(schema).toContain("FAILED");
    });
  });
});
