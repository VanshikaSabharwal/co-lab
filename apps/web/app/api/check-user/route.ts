import { NextResponse } from "next/server";
import prisma from "../../lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const phone = searchParams.get("phone");

  // Basic validation for phone number
  if (!phone || phone.length < 10) {
    // Adjust length check as necessary
    return NextResponse.json(
      { exists: false, error: "Invalid phone number" },
      { status: 400 }
    );
  }

  try {
    const user = await prisma.user.findUnique({
      where: {
        phone: phone,
      },
    });

    if (user) {
      return NextResponse.json({ exists: true });
    } else {
      return NextResponse.json({ exists: false });
    }
  } catch (err) {
    console.error("Error while checking user with phone:", phone, err); // More context in error log
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}