import { NextResponse } from "next/server";
import { getSessionUser, unauthorized } from "../../lib/apiAuth";
import {
  resolveRepoAccess,
  extensionOf,
  looksBinary,
  BINARY_EXTENSIONS,
  IMAGE_EXTENSIONS,
  EDITABLE_MAX,
  CODEMIRROR_MAX,
  VIEWER_MAX,
  CONTENTS_API_MAX,
} from "../../lib/githubFiles";

export async function POST(req: Request) {
  try {
    const me = await getSessionUser();
    if (!me) return unauthorized();

    const { groupId, filePath, ref } = await req.json();

    if (!groupId || !filePath) {
      return NextResponse.json(
        { error: "groupId and filePath are required" },
        { status: 400 },
      );
    }

    const resolved = await resolveRepoAccess(groupId, me.id);
    if (!resolved.ok) {
      return NextResponse.json({ error: resolved.error }, { status: resolved.status });
    }
    const { base, headers: ghHeaders } = resolved.access;
    const refQuery = ref ? `?ref=${encodeURIComponent(ref)}` : "";

    // Metadata first. For anything over 1 MB the Contents API returns the
    // entry's size and sha but omits content, which is exactly what's needed to
    // decide whether to fall back to the Blobs API.
    const metaRes = await fetch(
      `${base}/contents/${filePath}${refQuery}`,
      { headers: ghHeaders },
    );

    if (!metaRes.ok) {
      const error = await metaRes.json().catch(() => ({}));
      throw new Error(error.message || metaRes.statusText);
    }

    const meta = await metaRes.json();

    if (Array.isArray(meta)) {
      return NextResponse.json(
        { error: "That path is a directory, not a file" },
        { status: 400 },
      );
    }

    const size: number = meta.size ?? 0;
    const ext = extensionOf(filePath);
    const downloadUrl: string | null = meta.download_url ?? null;

    const name = filePath.split("/").pop();

    // Binaries are classified before any size check: an image is served from
    // its download_url by the browser regardless of how big it is, so the text
    // tiers below must not apply to it. No bytes are fetched here either — the
    // client renders a preview or a download card from this metadata alone.
    if (BINARY_EXTENSIONS.has(ext)) {
      return NextResponse.json(
        {
          binary: true,
          isImage: IMAGE_EXTENSIONS.has(ext),
          size,
          name,
          downloadUrl,
        },
        { status: 200 },
      );
    }

    // Text past the CodeMirror ceiling is read through the chunk endpoint
    // instead of being downloaded whole. Nothing is fetched here; the viewer
    // pulls only the ranges it needs to paint.
    if (size > CODEMIRROR_MAX) {
      // Past the plain-viewer ceiling, chunked reading is the only thing that
      // keeps memory bounded — so confirm the range support it depends on
      // rather than assuming it. A one-byte probe is enough.
      if (size > VIEWER_MAX) {
        const probe = await fetch(`${base}/contents/${filePath}${refQuery}`, {
          headers: {
            ...ghHeaders,
            Accept: "application/vnd.github.raw",
            Range: "bytes=0-0",
          },
        });
        // Drain so the socket can be reused rather than left hanging.
        await probe.arrayBuffer().catch(() => undefined);

        if (probe.status !== 206) {
          return NextResponse.json(
            { tooLarge: true, size, name, downloadUrl },
            { status: 200 },
          );
        }
      }

      return NextResponse.json(
        { chunked: true, size, name, downloadUrl },
        { status: 200 },
      );
    }

    let buf: Buffer;
    if (size > CONTENTS_API_MAX) {
      // Past 1 MB the Contents API returns metadata with empty content, so the
      // bytes have to come from the Git Blobs API (good to 100 MB).
      const blobRes = await fetch(`${base}/git/blobs/${meta.sha}`, {
        headers: ghHeaders,
      });
      if (!blobRes.ok) {
        const error = await blobRes.json().catch(() => ({}));
        throw new Error(error.message || blobRes.statusText);
      }
      const blob = await blobRes.json();
      buf = Buffer.from(blob.content ?? "", blob.encoding ?? "base64");
    } else {
      buf =
        meta.encoding === "base64"
          ? Buffer.from(meta.content ?? "", "base64")
          : Buffer.from(meta.content ?? "", "utf-8");
    }

    // Catches binaries whose extension didn't give them away.
    if (looksBinary(buf, ext)) {
      return NextResponse.json(
        { binary: true, isImage: false, size, name, downloadUrl },
        { status: 200 },
      );
    }

    return NextResponse.json(
      {
        content: buf.toString("utf-8"),
        size,
        // 1–5 MB still edits in CodeMirror, but the client drops the JSON
        // linter and full-file language parsing above this — those walk the
        // whole document on every keystroke.
        heavy: size > CONTENTS_API_MAX,
        readOnly: size > EDITABLE_MAX,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("Error fetching file content: ", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to fetch file content",
      },
      { status: 500 },
    );
  }
}
