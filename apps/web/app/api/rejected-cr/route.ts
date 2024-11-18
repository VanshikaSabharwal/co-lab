import { NextRequest, NextResponse } from "next/server";
import prisma from "../../lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json(
      { error: "User ID is required!" },
      { status: 400 }
    );
  }

  try {
    const rejectedNotifications = await prisma.rejectedCr.findMany({
      where: { userId },
      select: {
        id: true,
        userId: true,
        userName: true,
        groupId: true,
        groupName: true,
        message: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(
      { success: true, rejectedNotification: rejectedNotifications },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching rejected CR notifications:", error);
    return NextResponse.json(
      { error: "Error fetching rejected CR notifications!" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const { message, userId, groupId, userName, groupName } = await req.json();

  if (!message || !userId || !groupId || !userName || !groupName) {
    return NextResponse.json(
      { error: "All fields are required!" },
      { status: 400 }
    );
  }

  try {
    const notification = await prisma.rejectedCr.create({
      data: {
        userId,
        groupId,
        message,
        groupName,
        userName,
        createdAt: new Date(),
      },
    });
    return NextResponse.json({ success: true, notification }, { status: 201 });
  } catch (error) {
    console.error("Error creating rejected CR notification:", error);
    return NextResponse.json(
      { error: "Error creating rejected CR notification!" },
      { status: 500 }
    );
  }
}
