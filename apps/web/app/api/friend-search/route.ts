import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import prisma from "../../lib/prisma";

export async function POST(req: NextRequest) {
  try {
    //   Check logged-in user
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { message: "Not authenticated" },
        { status: 401 }
      );
    }

    //   Check if user has phone number
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { phone: true },
    });

    if (!currentUser?.phone) {
      return NextResponse.json(
        { requiresPhone: true, message: "Add your phone number first" },
        { status: 400 }
      );
    }

    const { phone } = await req.json();
    if (!phone) {
      return NextResponse.json({ message: "Friend phone is required" }, { status: 400 });
    }

    // ✅ Find friend by phone
    const existingFriend = await prisma.user.findFirst({
      where: { phone },
      select: { name: true, phone: true },
    });


    if (existingFriend) {
      return NextResponse.json(existingFriend);
    } else {
      return NextResponse.json(
        { message: "Friend does not exist on Ko-lab. Please ask him to join Ko-lab" },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("Error occurred:", error);
    return NextResponse.json(
      { message: "An error occurred" },
      { status: 500 }
    );
  }
}
