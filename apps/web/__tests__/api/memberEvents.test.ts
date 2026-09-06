/**
 * Membership events: the notification to the new member and the system line in
 * the group chat. Adding someone used to write neither, which is why inviting
 * a member produced a WhatsApp link and silence everywhere else.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../app/lib/prisma", () => ({
  default: {
    group: { findUnique: vi.fn() },
    notifications: { create: vi.fn() },
    groupMessage: { create: vi.fn() },
    invite: { findFirst: vi.fn(), update: vi.fn() },
  },
}));

import { recordMemberInvited, claimPendingInvites } from "../../app/lib/memberEvents";
import { isSystemMessage, systemMessageText } from "../../app/lib/systemMessages";
import prisma from "../../app/lib/prisma";

beforeEach(() => {
  vi.clearAllMocks();
  (prisma.group.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
    groupName: "Anime Website Group",
    ownerId: "owner-1",
    ownerName: "Vanshika",
  });
  (prisma.notifications.create as ReturnType<typeof vi.fn>).mockResolvedValue({});
  (prisma.groupMessage.create as ReturnType<typeof vi.fn>).mockResolvedValue({});
});

const base = {
  groupId: "g1",
  actorId: "owner-1",
  actorName: "Vanshika",
  inviteeName: "Rohan",
};

describe("recordMemberInvited", () => {
  it("addresses the notification to the invitee, not the owner", async () => {
    await recordMemberInvited({ ...base, inviteeId: "member-1" });

    const data = (prisma.notifications.create as ReturnType<typeof vi.fn>).mock
      .calls[0]![0].data;
    expect(data.recipientId).toBe("member-1");
    expect(data.type).toBe("GROUP_INVITE");
    // ownerId still points at the group owner so owner-scoped queries work.
    expect(data.ownerId).toBe("owner-1");
    expect(data.message).toContain("added you to Anime Website Group");
  });

  it("writes a system message to the group chat", async () => {
    await recordMemberInvited({ ...base, inviteeId: "member-1" });

    const data = (prisma.groupMessage.create as ReturnType<typeof vi.fn>).mock
      .calls[0]![0].data;
    expect(isSystemMessage(data.message)).toBe(true);
    expect(systemMessageText(data.message)).toBe("Vanshika added Rohan to the group");
    // Attributed to a real user, since senderId is a foreign key.
    expect(data.senderId).toBe("owner-1");
  });

  it("skips the notification when the invitee has no account yet", async () => {
    // A phone invite to someone who has not signed up — there is no user to
    // address, so only the chat line is written.
    await recordMemberInvited({ ...base, inviteeId: null, inviteeName: "+919000000000" });

    expect(prisma.notifications.create).not.toHaveBeenCalled();
    expect(prisma.groupMessage.create).toHaveBeenCalled();
  });

  it("does nothing for a group that doesn't exist", async () => {
    (prisma.group.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    await recordMemberInvited({ ...base, inviteeId: "member-1" });
    expect(prisma.notifications.create).not.toHaveBeenCalled();
  });

  it("never throws — the membership change already happened", async () => {
    (prisma.notifications.create as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("db down"),
    );
    await expect(
      recordMemberInvited({ ...base, inviteeId: "member-1" }),
    ).resolves.toBeUndefined();
  });
});

describe("claimPendingInvites", () => {
  it("marks a matching phone invite accepted", async () => {
    (prisma.invite.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "i1" });
    await claimPendingInvites("u1", "+919000000000", "g1");

    expect(prisma.invite.update).toHaveBeenCalledWith({
      where: { id: "i1" },
      data: { status: "accepted" },
    });
  });

  it("is a no-op for a user with no phone", async () => {
    await claimPendingInvites("u1", null, "g1");
    expect(prisma.invite.findFirst).not.toHaveBeenCalled();
  });

  it("is a no-op when nothing is pending", async () => {
    (prisma.invite.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    await claimPendingInvites("u1", "+91900", "g1");
    expect(prisma.invite.update).not.toHaveBeenCalled();
  });
});

describe("system message markers", () => {
  it("does not mistake a normal message for a system one", () => {
    expect(isSystemMessage("hey, __system__: is a weird thing to type")).toBe(false);
    expect(isSystemMessage("hello")).toBe(false);
  });
});
