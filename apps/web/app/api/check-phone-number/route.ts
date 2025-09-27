import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../lib/auth";
import prisma from "../../lib/prisma";


export async function GET(_req: Request) {
  try {
    //    Get logged-in user from session
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { exists: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const email = session.user.email;

    //    Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: { phone: true },
    });

    if (!user) {
      return NextResponse.json(
        { exists: false, error: "User not found" },
        { status: 404 }
      );
    }

    //    Return based on whether phone exists
    if (user.phone) {
      return NextResponse.json({ exists: true, phone: user.phone });
    } else {
      return NextResponse.json({ exists: false });
    }
  } catch (err) {
    console.error("Error while checking user phone:", err);
    return NextResponse.json(
      { exists: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
