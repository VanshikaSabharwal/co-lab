import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";

// Reads the session/headers, so it is per-request. Without this Next tries
// to prerender it at build time and logs a dynamic-server-usage error.
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const livekitHost = process.env.LIVEKIT_HOST || "http://localhost:7880";
  const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || "ws://localhost:7880";

  try {
    const response = await fetch(`${livekitHost}/twirp`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });

    const healthChecks = {
      server: "ok",
      livekit: response.ok ? "reachable" : "unreachable",
      livekitHost,
      livekitUrl,
      hasApiKey: !!process.env.LIVEKIT_API_KEY,
      hasApiSecret: !!process.env.LIVEKIT_API_SECRET,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(healthChecks, {
      status: response.ok ? 200 : 503,
    });
  } catch {
    return NextResponse.json({
      server: "ok",
      livekit: "unreachable",
      livekitHost,
      livekitUrl,
      hasApiKey: !!process.env.LIVEKIT_API_KEY,
      hasApiSecret: !!process.env.LIVEKIT_API_SECRET,
      error: "LiveKit connection failed",
      timestamp: new Date().toISOString(),
    }, { status: 503 });
  }
}
