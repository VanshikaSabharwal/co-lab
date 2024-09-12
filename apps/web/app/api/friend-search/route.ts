import { NextResponse, NextRequest } from "next/server";
import db from "@repo/db/client";

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json();

    if (!phone) {
      return NextResponse.json(
        { message: "Phone Number is required" },
        { status: 400 }
      );
    }

    const existingFriend = await db.user.findFirst({
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
        { status: 404 } // Changed to 404 Not Found for better semantics
      );
    }
  } catch (error) {
    console.error("Error occurred:", error);
    return NextResponse.json({ message: "An error occurred" }, { status: 500 });
  }
}
