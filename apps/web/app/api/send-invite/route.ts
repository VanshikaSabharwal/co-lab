import { NextResponse } from "next/server";
import prisma from "../../lib/prisma";
import { randomBytes } from "crypto";
import { getSessionUser, isGroupMember, unauthorized, forbidden } from "../../lib/apiAuth";
import { getRequestBaseUrl } from "../../lib/githubLink";
import { recordMemberInvited } from "../../lib/memberEvents";

export async function POST(req: Request) {
  const me = await getSessionUser();
  if (!me) return unauthorized();

  const { groupId, phoneNumber } = await req.json();
  if (!phoneNumber) {
    return NextResponse.json(
      { error: "Phone number is required" },
      { status: 400 },
    );
  }
  if (!groupId) {
    return NextResponse.json({ error: "groupId is required" }, { status: 400 });
  }
  if (!(await isGroupMember(groupId, me.id))) {
    return forbidden("Not a member of this group");
  }
  try {
    // Scoped by group: the schema's @@unique([phone, groupId]) allows the same
    // phone in different groups, but querying phone alone meant a number
    // invited once could never be invited anywhere else.
    const existingInvite = await prisma.invite.findFirst({
      where: { phone: phoneNumber, groupId },
    });

    if (existingInvite) {
      return NextResponse.json(
        { error: "Invite with this phone number already exists." },
        { status: 400 },
      );
    } else {
      const invite = await prisma.invite.create({
        data: {
          phone: phoneNumber,
          groupId,
          status: "pending",
          createdAt: new Date(),
        },
      });

      // A real join key rather than the old ?referral= id, which nothing ever
      // read — the invitee still had to find and join the group by hand. Also
      // uses getBaseUrl() instead of a hardcoded localhost, which was broken
      // anywhere but a dev machine.
      const link = await prisma.groupInviteLink.create({
        data: {
          token: randomBytes(24).toString("base64url"),
          groupId,
          createdBy: me.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });
      const invitationLink = `${getRequestBaseUrl(req)}/join/${link.token}`;
      const message = `You have been invited to join our app! Click here to sign up:${invitationLink}`;
      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;

      // If that phone already belongs to an account, notify them now. If not,
      // there is nobody to address yet — the join page raises the notification
      // once they sign up and redeem the link.
      const [existingUser, actor] = await Promise.all([
        prisma.user.findUnique({
          where: { phone: phoneNumber },
          select: { id: true, name: true, email: true },
        }),
        prisma.user.findUnique({
          where: { id: me.id },
          select: { name: true, email: true },
        }),
      ]);
      await recordMemberInvited({
        groupId,
        actorId: me.id,
        actorName: actor?.name || actor?.email || "Someone",
        inviteeId: existingUser?.id ?? null,
        inviteeName: existingUser?.name || existingUser?.email || phoneNumber,
      });

      return NextResponse.json({ success: true, whatsappUrl }, { status: 200 });
    }
  } catch (error) {
    console.error("Error sending invite:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
