import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { groupName, githubRepo, ownerId } = await req.json();

    // Check if required fields are provided
    if (!groupName || !githubRepo || !ownerId) {
      return NextResponse.json(
        { error: "Group name, GitHub repo URL, and owner ID are required" },
        { status: 400 }
      );
    }

    // Create a new group in the database
    const group = await prisma.group.create({
      data: {
        groupName,
        githubRepo,
        ownerId,
      },
    });

    return NextResponse.json(group, { status: 201 });
  } catch (err) {
    console.error("Error while creating group: ", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  } finally {
    // Close the Prisma connection
    await prisma.$disconnect();
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const groupId = url.searchParams.get("group");

    // Ensure the groupId parameter is provided
    if (!groupId) {
      return NextResponse.json(
        { error: "Group ID parameter is required" },
        { status: 400 }
      );
    }

    // Find group by ID
    const groupDetails = await prisma.group.findUnique({
      where: {
        id: groupId, // Assuming id is the primary key
      },
    });

    // Check if group exists
    if (!groupDetails) {
      return NextResponse.json(
        { error: `Group with ID ${groupId} not found` },
        { status: 404 }
      );
    }

    return NextResponse.json(groupDetails, { status: 200 });
  } catch (err) {
    console.error("Error fetching group: ", err);
    return NextResponse.json(
      { error: "Failed to fetch group data" },
      { status: 500 }
    );
  } finally {
    // Close the Prisma connection
    await prisma.$disconnect();
  }
}
