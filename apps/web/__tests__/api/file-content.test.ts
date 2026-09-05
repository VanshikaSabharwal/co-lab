/**
 * Covers how the route classifies a file before handing it to the editor.
 *
 * The original version decoded every response as UTF-8 text, so images came
 * back as replacement characters and anything over 1 MB failed outright with
 * GitHub's blob-size error.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../app/lib/prisma", () => ({
  default: {
    group: { findUnique: vi.fn() },
  },
}));

vi.mock("../../app/lib/encryption", () => ({
  decrypt: vi.fn((v: string) => v),
  extractRepoName: vi.fn((v: string) => v),
}));

vi.mock("../../app/lib/apiAuth", () => ({
  getSessionUser: vi.fn(),
  isGroupMember: vi.fn(),
  unauthorized: () => new Response(null, { status: 401 }),
  forbidden: () => new Response(null, { status: 403 }),
}));

import { POST } from "../../app/api/file-content/route";
import prisma from "../../app/lib/prisma";
import { getSessionUser, isGroupMember } from "../../app/lib/apiAuth";

const ONE_MB = 1024 * 1024;

function request(filePath: string): Request {
  return new Request("http://localhost:3000/api/file-content", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ groupId: "g1", filePath }),
  });
}

/** Queue of responses for successive global.fetch calls. */
function mockGithub(...responses: Array<Record<string, unknown>>) {
  const queue = [...responses];
  global.fetch = vi.fn(async () => ({
    ok: true,
    json: async () => queue.shift() ?? {},
  })) as unknown as typeof fetch;
}

beforeEach(() => {
  vi.clearAllMocks();
  (getSessionUser as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "u1" });
  (isGroupMember as ReturnType<typeof vi.fn>).mockResolvedValue(true);
  (prisma.group.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
    githubRepo: "repo",
    ownerName: "owner",
    githubAccessToken: "token",
  });
});

describe("POST /api/file-content", () => {
  it("flags an image without fetching its bytes", async () => {
    // 80 MB: far past every text tier. Images must bypass them entirely,
    // since the browser streams the URL rather than the server buffering it.
    mockGithub({
      size: 80 * ONE_MB,
      sha: "abc",
      download_url: "https://raw.example/img.jpg",
    });

    const res = await POST(request("img/photo.jpg"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.binary).toBe(true);
    expect(body.isImage).toBe(true);
    expect(body.downloadUrl).toBe("https://raw.example/img.jpg");
    expect(body.content).toBeUndefined();
    expect(body.tooLarge).toBeUndefined();
    expect(body.chunked).toBeUndefined();
    // Metadata only — no second call to pull megabytes of JPEG through.
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1);
  });

  it("uses the blobs API for text over the contents-API limit", async () => {
    const big = "x".repeat(200);
    mockGithub(
      { size: 3 * ONE_MB, sha: "deadbeef", encoding: "none", content: "" },
      { content: Buffer.from(big).toString("base64"), encoding: "base64" },
    );

    const res = await POST(request("pnpm-lock.yaml"));
    const body = await res.json();

    expect(body.content).toBe(big);
    // 1–5 MB stays editable, but heavy: linting and parsing come off.
    expect(body.heavy).toBe(true);
    expect(body.readOnly).toBe(false);
    const urls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.map(
      (c) => c[0],
    );
    expect(urls[1]).toContain("/git/blobs/deadbeef");
  });

  it("sends 5-25 MB text to the chunked viewer without fetching bytes", async () => {
    mockGithub({ size: 10 * ONE_MB, sha: "s", download_url: "https://raw/x" });

    const body = await (await POST(request("big.json"))).json();
    expect(body.chunked).toBe(true);
    expect(body.content).toBeUndefined();
    // Metadata only — the viewer pulls ranges itself.
    expect((global.fetch as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1);
  });

  it("still chunks past the viewer ceiling when ranges are supported", async () => {
    const calls: Array<Record<string, unknown>> = [];
    global.fetch = vi.fn(async (_url: string, init?: RequestInit) => {
      calls.push((init?.headers ?? {}) as Record<string, unknown>);
      // First call is metadata, second is the range probe.
      if (calls.length === 1) {
        return {
          ok: true,
          json: async () => ({ size: 40 * ONE_MB, sha: "s", download_url: "u" }),
        };
      }
      return { ok: true, status: 206, arrayBuffer: async () => new ArrayBuffer(1) };
    }) as unknown as typeof fetch;

    const body = await (await POST(request("huge.log"))).json();
    expect(body.chunked).toBe(true);
    expect(body.tooLarge).toBeUndefined();
  });

  it("refuses a huge file when range requests are not honoured", async () => {
    let call = 0;
    global.fetch = vi.fn(async () => {
      call++;
      if (call === 1) {
        return {
          ok: true,
          json: async () => ({ size: 40 * ONE_MB, sha: "s", download_url: "u" }),
        };
      }
      // 200 instead of 206 — the server ignored Range, so chunking can't
      // bound memory and the file is refused.
      return { ok: true, status: 200, arrayBuffer: async () => new ArrayBuffer(1) };
    }) as unknown as typeof fetch;

    const body = await (await POST(request("huge.log"))).json();
    expect(body.tooLarge).toBe(true);
    expect(body.size).toBe(40 * ONE_MB);
  });

  it("detects a binary whose extension looks like text", async () => {
    // NUL bytes can't occur in valid UTF-8 text.
    const bytes = Buffer.from([0x4d, 0x5a, 0x00, 0x00, 0x01]);
    mockGithub({
      size: 500,
      sha: "s",
      encoding: "base64",
      content: bytes.toString("base64"),
    });

    const body = await (await POST(request("weird.dat"))).json();
    expect(body.binary).toBe(true);
    expect(body.isImage).toBe(false);
  });

  it("still returns ordinary small text files", async () => {
    mockGithub({
      size: 42,
      sha: "s",
      encoding: "base64",
      content: Buffer.from('{"a":1}').toString("base64"),
    });

    const body = await (await POST(request("app/config.json"))).json();
    expect(body.content).toBe('{"a":1}');
    expect(body.readOnly).toBe(false);
    expect(body.binary).toBeUndefined();
  });

  it("rejects a directory path", async () => {
    mockGithub([] as unknown as Record<string, unknown>);
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => [{ name: "a" }],
    })) as unknown as typeof fetch;

    const res = await POST(request("src"));
    expect(res.status).toBe(400);
  });
});
