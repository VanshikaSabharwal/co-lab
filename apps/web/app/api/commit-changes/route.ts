import { NextRequest, NextResponse } from "next/server";
import { Octokit } from "@octokit/rest";
import prisma from "../../lib/prisma";

// Handling GET requests
export async function GET(req: NextRequest) {
  return NextResponse.json(
    { message: "Method not allowed. Use POST to commit changes." },
    { status: 405 }
  );
}

// Handling POST requests
export async function POST(req: NextRequest) {
  try {
    const { userId, modifiedFiles, groupId } = await req.json();

    if (!userId || !modifiedFiles || !groupId) {
      return NextResponse.json(
        { message: "Missing required parameters" },
        { status: 400 }
      );
    }
    const groupDetails = await prisma.modifiedFiles.findFirst({
      where: {
        groupId,
        OR: [{ userId: userId }, { group: { ownerId: userId } }],
      },
      select: {
        userId: true,
        group: {
          select: {
            groupName: true,
            ownerName: true,
            ownerId: true,
            githubAccessToken: true,
          },
        },
      },
    });
    if (!groupDetails) {
      return NextResponse.json(
        { Error: "No modified file found" },
        { status: 404 }
      );
    }

    // if (userId === modifiedFiles?.group.ownerId){
    //   const
    // }

    if (!groupId || !groupDetails.group.githubAccessToken) {
      return NextResponse.json(
        { error: "GitHub token not found for the group." },
        { status: 404 }
      );
    }
    console.log(groupDetails);
    const octokit = new Octokit({
      auth: groupDetails.group.githubAccessToken,
    });

    // Commit each modified file to GitHub
    for (const file of modifiedFiles) {
      await octokit.repos.createOrUpdateFileContents({
        owner: groupDetails.group.ownerName,
        repo: groupDetails.group.groupName,
        path: file.path,
        message: `Updated ${file.name}`,
        content: Buffer.from(file.content).toString("base64"),
        sha: file.sha,
      });
    }

    return NextResponse.json(
      { message: "Changes committed successfully!" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error committing changes:", error);
    return NextResponse.json(
      { error: "Failed to commit changes." },
      { status: 500 }
    );
  }
}
