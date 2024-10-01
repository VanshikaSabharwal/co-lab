import { NextResponse } from "next/server";
import prisma from "../../lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json(
      { error: "No User Id provided." },
      { status: 400 }
    );
  }

  try {
    // Use findMany to fetch all groups the user is a part of or owns
    const groups = await prisma.group.findMany({
      where: {
        OR: [
          { ownerId: userId },
          {
            members: {
              some: { userId: userId },
            },
          },
        ],
      },
      include: {
        members: true,
      },
    });

    // Check if groups are found
    if (!groups.length) {
      return NextResponse.json(
        { message: "No groups found for this user." },
        { status: 404 }
      );
    }

    return NextResponse.json({ groups }, { status: 200 });
  } catch (error) {
    console.error("Error checking group membership:", error);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
