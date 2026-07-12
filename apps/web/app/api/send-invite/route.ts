import { NextResponse } from "next/server";
import prisma from "../../lib/prisma";
import { getSessionUser, isGroupMember, unauthorized, forbidden } from "../../lib/apiAuth";

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
  if (groupId && !(await isGroupMember(groupId, me.id))) {
    return forbidden("Not a member of this group");
  }
  try {
    // Check if an invite with the same phone number already exists
    const existingInvite = await prisma.invite.findFirst({
      where: { phone: phoneNumber },
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

      const invitationLink = `http://localhost:3000/signup?referral=${invite.id}`;
      const message = `You have been invited to join our app! Click here to sign up:${invitationLink}`;
      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;

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
