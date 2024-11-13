import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const GITHUB_REPOS_URL = "https://api.github.com/user/repos";
const GITHUB_USER_URL = "https://api.github.com/user";

// Named export for GET request
export async function GET(req: NextRequest) {
  // Extract token using getToken
  const token = await getToken({ req: req as any });

  // Check if the token exists and has an accessToken property
  if (!token || !token.accessToken) {
    return NextResponse.json(
      { error: "Missing or invalid access token" },
      { status: 401 }
    );
  }

  try {
    // Fetch user data from GitHub
    const userResponse = await fetch(GITHUB_USER_URL, {
      headers: {
        Authorization: `token ${token.accessToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    // Check if user data request was successful
    if (!userResponse.ok) {
      return NextResponse.json(
        { error: `GitHub API error fetching user: ${userResponse.statusText}` },
        { status: userResponse.status }
      );
    }

    const userData = await userResponse.json();

    // Fetch user repositories from GitHub
    const reposResponse = await fetch(GITHUB_REPOS_URL, {
      headers: {
        Authorization: `token ${token.accessToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    // Check if repos request was successful
    if (!reposResponse.ok) {
      return NextResponse.json(
        {
          error: `GitHub API error fetching repos: ${reposResponse.statusText}`,
        },
        { status: reposResponse.status }
      );
    }

    const repos = await reposResponse.json();

    // Return both user data and repositories
    return NextResponse.json({ userData, repos }, { status: 200 });
  } catch (error) {
    console.error("Error fetching from GitHub API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
