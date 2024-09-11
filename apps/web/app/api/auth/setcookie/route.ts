"use server";
import { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { serialize } from "cookie"; // Import serialize from 'cookie'

// Named export for POST requests
export async function POST(request: NextRequest) {
  if (request.method !== "POST") {
    return NextResponse.json(
      { message: "Method not allowed" },
      { status: 405 }
    );
  }

  try {
    const { user } = await request.json(); // Get user data from request body

    if (!user) {
      return NextResponse.json(
        { message: "User data is required" },
        { status: 400 }
      );
    }

    // Serialize cookie
    const userCookie = serialize("nextAuthUser", JSON.stringify(user), {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 30, // Expires in 30 days
      path: "/", // Accessible across all routes
      secure: process.env.NODE_ENV === "production", // Set secure flag for production
      sameSite: "lax", // Recommended for security
    });

    // Set the cookie
    const response = NextResponse.json({ message: "Cookie set successfully" });
    response.headers.append("Set-Cookie", userCookie);

    return response;
  } catch (error) {
    console.error("Error setting cookie:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
