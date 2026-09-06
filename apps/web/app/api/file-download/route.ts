import { getSessionUser, unauthorized } from "../../lib/apiAuth";
import { NextResponse } from "next/server";
import { resolveRepoAccess, extensionOf } from "../../lib/githubFiles";

/**
 * Streams a file to the browser as an attachment.
 *
 * A plain `<a download href={download_url}>` does not work here: download_url
 * points at raw.githubusercontent.com, and browsers ignore the `download`
 * attribute on cross-origin links — the click navigated away instead of saving
 * a file, and for a private repo the signed URL could 404 outright.
 *
 * Serving the bytes from our own origin with Content-Disposition makes the
 * download actually happen, and keeps the GitHub token server-side.
 *
 * GET rather than POST so the URL can be used directly as a link target.
 */
export async function GET(req: Request) {
  const me = await getSessionUser();
  if (!me) return unauthorized();

  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get("group");
  const filePath = searchParams.get("path");
  const ref = searchParams.get("ref");

  if (!groupId || !filePath) {
    return NextResponse.json(
      { error: "group and path are required" },
      { status: 400 },
    );
  }

  const resolved = await resolveRepoAccess(groupId, me.id);
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }
  const { base, headers } = resolved.access;

  const refQuery = ref ? `?ref=${encodeURIComponent(ref)}` : "";
  const upstream = await fetch(`${base}/contents/${filePath}${refQuery}`, {
    headers: {
      ...headers,
      // Raw bytes, not the base64 JSON envelope — this response is piped
      // straight to the browser without being buffered in memory.
      Accept: "application/vnd.github.raw",
    },
  });

  if (!upstream.ok || !upstream.body) {
    return NextResponse.json(
      { error: `Couldn't fetch the file (${upstream.status})` },
      { status: upstream.status === 404 ? 404 : 502 },
    );
  }

  const name = filePath.split("/").pop() || "download";
  // Quotes and backslashes would break out of the header's quoted string;
  // filename* carries the real UTF-8 name for anything non-ASCII.
  const asciiName = name.replace(/["\\]/g, "_").replace(/[^\x20-\x7e]/g, "_");

  const contentType =
    upstream.headers.get("content-type") ?? guessContentType(filePath);
  const length = upstream.headers.get("content-length");

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(name)}`,
      ...(length ? { "Content-Length": length } : {}),
      // The URL carries a group id, not a token, but the bytes are private.
      "Cache-Control": "private, no-store",
    },
  });
}

const CONTENT_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  ico: "image/x-icon",
  pdf: "application/pdf",
  zip: "application/zip",
  json: "application/json",
};

function guessContentType(filePath: string): string {
  return CONTENT_TYPES[extensionOf(filePath)] ?? "application/octet-stream";
}
