/**
 * The trash lists staged deletions and sweeps expired ones.
 *
 * The important invariant: expiry *restores* a file. A staged deletion has not
 * touched the repo, so ageing out means dropping the staging — it can never
 * destroy anything.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../app/lib/prisma", () => ({
  default: {
    modifiedFiles: { findMany: vi.fn(), deleteMany: vi.fn() },
  },
}));

vi.mock("../../app/lib/apiAuth", () => ({
  getSessionUser: vi.fn(),
  requireCodeAccess: vi.fn(),
  unauthorized: () => new Response(null, { status: 401 }),
  forbidden: () => new Response(null, { status: 403 }),
}));

import { GET, TRASH_TTL_DAYS } from "../../app/api/trash/route";
import prisma from "../../app/lib/prisma";
import { getSessionUser, requireCodeAccess } from "../../app/lib/apiAuth";

const DAY_MS = 24 * 60 * 60 * 1000;

function request(group = "g1"): Request {
  return new Request(`http://localhost:3000/api/trash?group=${group}`);
}

/** A staged deletion last touched `daysAgo` days ago. */
function staged(name: string, daysAgo: number, id = 1) {
  return {
    id,
    name,
    path: `src/${name}`,
    updatedAt: new Date(Date.now() - daysAgo * DAY_MS),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  (getSessionUser as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "u1" });
  (requireCodeAccess as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });
  (prisma.modifiedFiles.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({
    count: 0,
  });
  (prisma.modifiedFiles.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
});

describe("GET /api/trash", () => {
  it("reports days remaining for each staged deletion", async () => {
    (prisma.modifiedFiles.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      staged("fresh.ts", 0, 1),
      staged("old.ts", 9, 2),
    ]);

    const body = await (await GET(request())).json();

    expect(body.items).toHaveLength(2);
    expect(body.items[0].daysLeft).toBe(TRASH_TTL_DAYS);
    expect(body.items[1].daysLeft).toBe(1);
  });

  it("counts items inside their final day for the banner", async () => {
    (prisma.modifiedFiles.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      staged("a.ts", 9, 1),
      staged("b.ts", 9.5, 2),
      staged("c.ts", 2, 3),
    ]);

    const body = await (await GET(request())).json();
    expect(body.expiringSoon).toBe(2);
  });

  it("sweeps deletions older than the TTL", async () => {
    await GET(request());

    const where = (prisma.modifiedFiles.deleteMany as ReturnType<typeof vi.fn>).mock
      .calls[0]![0].where;
    expect(where.deleted).toBe(true);
    expect(where.userId).toBe("u1");
    // Only staged deletions past the cutoff, never edit drafts.
    const cutoff = where.updatedAt.lt.getTime();
    expect(Date.now() - cutoff).toBeGreaterThanOrEqual(TRASH_TTL_DAYS * DAY_MS - 1000);
  });

  it("reports how many expired so the UI can say they were restored", async () => {
    (prisma.modifiedFiles.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({
      count: 3,
    });

    const body = await (await GET(request())).json();
    expect(body.restoredOnExpiry).toBe(3);
  });

  it("scopes the listing to the current user", async () => {
    await GET(request());
    const where = (prisma.modifiedFiles.findMany as ReturnType<typeof vi.fn>).mock
      .calls[0]![0].where;
    expect(where.userId).toBe("u1");
    expect(where.deleted).toBe(true);
  });

  it("requires code access", async () => {
    (requireCodeAccess as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      res: new Response(null, { status: 403 }),
    });
    const res = await GET(request());
    expect(res.status).toBe(403);
  });

  it("rejects an anonymous caller", async () => {
    (getSessionUser as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await GET(request());
    expect(res.status).toBe(401);
  });

  it("requires a group", async () => {
    const res = await GET(new Request("http://localhost:3000/api/trash"));
    expect(res.status).toBe(400);
  });
});
