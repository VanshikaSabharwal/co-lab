import { NextResponse, NextRequest } from "next/server";
import prisma from "../../lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json();

    if (!phone) {
      return NextResponse.json(
        { message: "Phone Number is required" },
        { status: 400 }
      );
    }

    const existingFriend = await prisma.user.findFirst({
      where: { phone },
    });

    if (existingFriend) {
      return NextResponse.json({
        name: existingFriend.username,
        phone: existingFriend.phone,
      });
    } else {
      return NextResponse.json(
        { message: "Friend does not exist" },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("Error occurred:", error);
    return NextResponse.json({ message: "An error occurred" }, { status: 500 });
  }
}
