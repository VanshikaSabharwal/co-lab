import { NextApiRequest, NextApiResponse } from "next";
import { Octokit } from "@octokit/rest";
import prisma from "../../lib/prisma";

export async function GET(req: NextApiRequest, res: NextApiResponse) {
  res
    .status(405)
    .json({ message: "Method not allowed. Use POST to commit changes." });
}

export async function POST(req: NextApiRequest, res: NextApiResponse) {
  const { userId, repoOwner, repoName, modifiedFiles, groupId } = req.body;

  if (!userId || !repoOwner || !repoName || !modifiedFiles || !groupId) {
    return res.status(400).json({ message: "Missing required parameters" });
  }

  try {
    const group = await prisma.group.findUnique({
      where: {
        id: groupId,
      },
      select: {
        githubAccessToken: true,
      },
    });

    if (!group || !group.githubAccessToken) {
      return res
        .status(404)
        .json({ message: "GitHub token not found for the group." });
    }

    const octokit = new Octokit({
      auth: group.githubAccessToken,
    });

    for (const file of modifiedFiles) {
      await octokit.repos.createOrUpdateFileContents({
        owner: repoOwner,
        repo: repoName,
        path: file.path,
        message: `Updated ${file.name}`,
        content: Buffer.from(file.content).toString("base64"),
        sha: file.sha,
      });
    }

    res.status(200).json({ message: "Changes committed successfully!" });
  } catch (error) {
    console.error("Error committing changes:", error);
    res.status(500).json({ message: "Failed to commit changes." });
  }
}
