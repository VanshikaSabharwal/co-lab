import { NextResponse } from "next/server";
import prisma from "../../lib/prisma";
import { getSessionUser, unauthorized, requireCodeAccess } from "../../lib/apiAuth";
import { TRASH_TTL_DAYS, TRASH_WARN_DAYS } from "../../lib/githubFiles";

/**
 * The trash: files staged for deletion but not yet applied.
 *
 * Worth being precise about what "expiry" means here, because it is the
 * opposite of a normal trash. Nothing has been removed from the repo — a
 * staged deletion is a draft that only takes effect when a change request
 * merges. So when a staged deletion ages out, the safe thing is to *drop the
 * staging*, which restores the file. Expiry can never destroy anything.
 *
 * Deletions are applied by merging a change request; that path is unchanged and
 * lives in /api/vcs/change-request.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export async function GET(req: Request) {
  const me = await getSessionUser();
  if (!me) return unauthorized();

  const { searchParams } = new URL(req.url);
  const groupId = searchParams.get("group");
  if (!groupId) {
    return NextResponse.json({ error: "group is required" }, { status: 400 });
  }

  const gate = await requireCodeAccess(groupId, me.id);
  if (!gate.ok) return gate.res;

  const now = Date.now();
  const cutoff = new Date(now - TRASH_TTL_DAYS * DAY_MS);

  // Sweep on read rather than on a schedule. There is no cron in this app, and
  // un-staging is idempotent and harmless, so the next person to open the trash
  // does the cleanup. Anything older than the TTL is un-staged, restoring the
  // file to its normal state.
  const expired = await prisma.modifiedFiles.deleteMany({
    where: {
      userId: me.id,
      groupId,
      deleted: true,
      updatedAt: { lt: cutoff },
    },
  });

  const rows = await prisma.modifiedFiles.findMany({
    where: { userId: me.id, groupId, deleted: true },
    select: { id: true, name: true, path: true, updatedAt: true },
    orderBy: { updatedAt: "asc" },
  });

  const items = rows.map((row) => {
    const expiresAt = row.updatedAt.getTime() + TRASH_TTL_DAYS * DAY_MS;
    return {
      id: row.id,
      name: row.name,
      path: row.path,
      stagedAt: row.updatedAt.toISOString(),
      expiresAt: new Date(expiresAt).toISOString(),
      // Rounded up, so "1 day left" covers anything inside the final 24 hours
      // rather than reading 0 for most of that day.
      daysLeft: Math.max(0, Math.ceil((expiresAt - now) / DAY_MS)),
    };
  });

  return NextResponse.json({
    items,
    // Drives the banner and the badge without a second request.
    expiringSoon: items.filter((i) => i.daysLeft <= TRASH_WARN_DAYS).length,
    ttlDays: TRASH_TTL_DAYS,
    restoredOnExpiry: expired.count,
  });
}
