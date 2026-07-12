import { NextResponse } from "next/server";
import prisma from "../../lib/prisma";
import { getSessionUser, unauthorized, forbidden } from "../../lib/apiAuth";

export async function POST(req: Request) {
  const me = await getSessionUser();
  if (!me) return unauthorized();

  const { userId, groupId } = await req.json();

  if (!userId || !groupId) {
    return NextResponse.json(
      { error: "User ID and Group ID are required" },
      { status: 400 },
    );
  }

  try {
    // Check if the group exists
    const groupExists = await prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!groupExists) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Only the group owner may add other users; anyone may add themselves
    if (userId !== me.id && groupExists.ownerId !== me.id) {
      return forbidden("Only the group owner can add other members");
    }

    // Check if the user is already a member of the group
    const existingMember = await prisma.groupMember.findFirst({
      where: {
        userId,
        groupId,
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: "User is already a member of the group" },
        { status: 400 },
      );
    }

    // Add user to the group
    await prisma.groupMember.create({
      data: {
        userId,
        groupId,
        role: "MEMBER", // Default role as per your schema
      },
    });

    return NextResponse.json(
      { success: true, message: "User added to the group" },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error adding user to group:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
