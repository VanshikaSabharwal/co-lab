import { NextResponse } from "next/server";
import prisma from "../../lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const phone = searchParams.get("phone");

  if (!phone) {
    return NextResponse.json({ exists: false }, { status: 400 });
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
    console.log("Error while checking user: ", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
