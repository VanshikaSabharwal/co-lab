import { NextRequest, NextResponse } from "next/server";
import prisma from "../../lib/prisma";

// POST endpoint to create a new guest user
export async function POST(req: NextRequest) {
  const { guestId } = await req.json();

  if (!guestId) {
    return NextResponse.json(
      { message: "Guest ID is required" },
      { status: 400 }
    );
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000); // Expires in 2 days

  try {
    const guest = await prisma.guestUser.create({
      data: {
        guestId: guestId,
        createdAt: now,
        expiresAt: expiresAt,
      },
    });
    return NextResponse.json(guest, { status: 201 });
  } catch (err) {
    console.error("Error creating guest:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve all guest users
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const guestId = searchParams.get("guestId");

  if (!guestId) {
    return NextResponse.json(
      { message: "Guest ID is required" },
      { status: 400 }
    );
  }

  try {
    const guest = await prisma.guestUser.findFirst({ where: { guestId } });
    if (!guest) {
      return NextResponse.json({ message: "Guest not found" }, { status: 404 });
    }
    return NextResponse.json(guest, { status: 200 });
  } catch (err) {
    console.error("Error retrieving guest:", err);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
