import { NextRequest, NextResponse } from "next/server";
import prisma from "../../lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { phone } = await req.json();

    if (!phone) {
      return NextResponse.json({ message: "Phone is required" }, { status: 400 });
    }

    //     Get current session
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    //     Update user phone using email
    await prisma.user.update({
      where: { email: session.user.email },
      data: { phone },
    });

    return NextResponse.json({ message: "Phone updated successfully" });
  } catch (err) {
    console.error("Error updating phone:", err);
    return NextResponse.json(
      { message: "Failed to update phone" },
      { status: 500 }
    );
  }
}
