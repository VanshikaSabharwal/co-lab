import { NextRequest, NextResponse } from "next/server";
import prisma from "../../lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");
  const id = searchParams.get("id");
  const phone = searchParams.get("phone");

  if (!email && !id && !phone) {
    return NextResponse.json({ error: "Provide email, id, or phone" }, { status: 400 });
  }

  try {
    const user = await prisma.user.findFirst({
      where: { OR: [{ email: email ?? undefined }, { id: id ?? undefined }, { phone: phone ?? undefined }] },
      select: { id: true, phone: true, name: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
