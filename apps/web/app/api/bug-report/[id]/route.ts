import { NextResponse } from "next/server";
import prisma from "../../../lib/prisma";
import { getSessionUserRecord, unauthorized, forbidden } from "../../../lib/apiAuth";
import { isBugAdmin } from "../../../lib/bugReport";

const STATUSES = ["OPEN", "IN_PROGRESS", "FIXED", "WONT_FIX"] as const;

// PATCH — app admin updates a report's status. On resolution, notify the reporter.
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const me = await getSessionUserRecord();
  if (!me) return unauthorized();
  if (!isBugAdmin(me.email)) return forbidden("Only the app owner can update bug reports");

  const { status } = await req.json();
  if (!STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const report = await prisma.bugReport.findUnique({
    where: { id: params.id },
    select: { id: true, title: true, status: true, reporterId: true },
  });
  if (!report) return NextResponse.json({ error: "Report not found" }, { status: 404 });

  await prisma.bugReport.update({ where: { id: report.id }, data: { status } });

  // Notify the reporter when their bug is resolved (reuse the notifications table)
  const becameResolved =
    (status === "FIXED" || status === "WONT_FIX") &&
    report.status !== "FIXED" &&
    report.status !== "WONT_FIX";

  if (becameResolved) {
    await prisma.notifications.create({
      data: {
        userId: report.reporterId,
        ownerId: report.reporterId, // notification is addressed to the reporter
        ownerName: "",
        userName: "Ko-Lab",
        groupId: "",
        groupName: "",
        message:
          status === "FIXED"
            ? `Your bug report "${report.title}" was marked fixed 🎉`
            : `Your bug report "${report.title}" was closed.`,
        createdAt: new Date(),
      },
    });
  }

  return NextResponse.json({ status });
}
