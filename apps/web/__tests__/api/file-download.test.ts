/**
 * The download route exists because `<a download>` is ignored on cross-origin
 * links — pointing at raw.githubusercontent.com navigated instead of saving.
 * These tests pin the headers that make a browser actually write a file.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../app/lib/prisma", () => ({
  default: { group: { findUnique: vi.fn() } },
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

import { GET } from "../../app/api/file-download/route";
import prisma from "../../app/lib/prisma";
import { getSessionUser, isGroupMember } from "../../app/lib/apiAuth";

function request(path: string, group = "g1"): Request {
  return new Request(
    `http://localhost:3000/api/file-download?group=${group}&path=${encodeURIComponent(path)}`,
  );
}

function mockUpstream(opts: { ok?: boolean; status?: number; type?: string } = {}) {
  const captured: { headers?: Record<string, string> } = {};
  global.fetch = vi.fn(async (_url: string, init?: RequestInit) => {
    captured.headers = init?.headers as Record<string, string>;
    return {
      ok: opts.ok ?? true,
      status: opts.status ?? 200,
      body: opts.ok === false ? null : new ReadableStream(),
      headers: {
        get: (h: string) =>
          h.toLowerCase() === "content-type" ? (opts.type ?? null) : null,
      },
    };
  }) as unknown as typeof fetch;
  return captured;
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

describe("GET /api/file-download", () => {
  it("sends Content-Disposition: attachment so the browser saves the file", async () => {
    mockUpstream();
    const res = await GET(request("img/photo.jpg"));

    const disposition = res.headers.get("content-disposition") ?? "";
    expect(disposition).toContain("attachment");
    expect(disposition).toContain('filename="photo.jpg"');
  });

  it("asks GitHub for raw bytes rather than the base64 envelope", async () => {
    const captured = mockUpstream();
    await GET(request("a.bin"));
    expect(captured.headers?.Accept).toBe("application/vnd.github.raw");
  });

  it("neutralises quotes in a filename so the header can't be broken", async () => {
    mockUpstream();
    const res = await GET(request('weird".name.txt'));
    const disposition = res.headers.get("content-disposition") ?? "";
    // The raw quote must not survive into the quoted string.
    expect(disposition).toContain('filename="weird_.name.txt"');
  });

  it("carries a non-ASCII name in filename*", async () => {
    mockUpstream();
    const res = await GET(request("café.txt"));
    const disposition = res.headers.get("content-disposition") ?? "";
    expect(disposition).toContain("filename*=UTF-8''");
    expect(disposition).toContain(encodeURIComponent("café.txt"));
  });

  it("falls back to a type guess when GitHub sends none", async () => {
    mockUpstream({ type: undefined });
    const res = await GET(request("logo.png"));
    expect(res.headers.get("content-type")).toBe("image/png");
  });

  it("does not cache private file bytes", async () => {
    mockUpstream();
    const res = await GET(request("secret.env"));
    expect(res.headers.get("cache-control")).toContain("no-store");
  });

  it("passes a branch ref through to GitHub", async () => {
    let url = "";
    global.fetch = vi.fn(async (u: string) => {
      url = u;
      return {
        ok: true,
        status: 200,
        body: new ReadableStream(),
        headers: { get: () => null },
      };
    }) as unknown as typeof fetch;

    await GET(
      new Request(
        "http://localhost:3000/api/file-download?group=g1&path=a.txt&ref=dev",
      ),
    );
    expect(url).toContain("ref=dev");
  });

  it("404s a missing file rather than streaming an error page", async () => {
    mockUpstream({ ok: false, status: 404 });
    const res = await GET(request("nope.txt"));
    expect(res.status).toBe(404);
  });

  it("refuses a caller who isn't a group member", async () => {
    (isGroupMember as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    const res = await GET(request("a.txt"));
    expect(res.status).toBe(403);
  });

  it("rejects an anonymous caller", async () => {
    (getSessionUser as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await GET(request("a.txt"));
    expect(res.status).toBe(401);
  });
});
