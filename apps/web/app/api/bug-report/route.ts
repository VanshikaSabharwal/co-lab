import { NextResponse } from "next/server";
import prisma from "../../lib/prisma";
import { getSessionUserRecord, unauthorized } from "../../lib/apiAuth";
import { createBugIssue, isBugAdmin } from "../../lib/bugReport";

const CATEGORIES = ["BUG", "UI", "PERFORMANCE", "OTHER"] as const;
const SEVERITIES = ["LOW", "MEDIUM", "HIGH"] as const;

// POST — submit a bug report. Saves a row, then best-effort opens a GitHub issue.
export async function POST(req: Request) {
  const me = await getSessionUserRecord();
  if (!me) return unauthorized();

  const body = await req.json();
  const title = (body.title ?? "").trim();
  const description = (body.description ?? "").trim();

  if (!title || !description) {
    return NextResponse.json({ error: "Title and description are required" }, { status: 400 });
  }

  const category = CATEGORIES.includes(body.category) ? body.category : "BUG";
  const severity = SEVERITIES.includes(body.severity) ? body.severity : "MEDIUM";
  // Cap the screenshot data URL to keep rows sane (~2MB base64)
  const screenshot =
    typeof body.screenshot === "string" && body.screenshot.length < 2_800_000
      ? body.screenshot
      : null;

  const report = await prisma.bugReport.create({
    data: {
      reporterId: me.id,
      title,
      description,
      category,
      severity,
      url: typeof body.url === "string" ? body.url.slice(0, 500) : null,
      userAgent: typeof body.userAgent === "string" ? body.userAgent.slice(0, 400) : null,
      context: body.context ?? undefined,
      screenshot,
    },
  });

  // Best-effort GitHub issue (skipped gracefully if env not set)
  const issue = await createBugIssue({
    id: report.id,
    title,
    description,
    category,
    severity,
    url: report.url,
    userAgent: report.userAgent,
    reporterName: me.name,
  });

  if (issue) {
    await prisma.bugReport.update({
      where: { id: report.id },
      data: { githubIssueNo: issue.number, githubIssueUrl: issue.url },
    });
  }

  return NextResponse.json(
    { id: report.id, githubIssueUrl: issue?.url ?? null },
    { status: 201 },
  );
}

// GET — the caller's own reports, or all reports for the app admin (?all=1).
export async function GET(req: Request) {
  const me = await getSessionUserRecord();
  if (!me) return unauthorized();

  const { searchParams } = new URL(req.url);
  const wantAll = searchParams.get("all") === "1";
  const admin = isBugAdmin(me.email);

  const reports = await prisma.bugReport.findMany({
    where: wantAll && admin ? {} : { reporterId: me.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      severity: true,
      status: true,
      url: true,
      githubIssueUrl: true,
      githubIssueNo: true,
      createdAt: true,
      // Screenshot only in the admin (all) view to keep list payloads small
      screenshot: wantAll && admin,
      reporter: wantAll && admin ? { select: { name: true, email: true } } : false,
    },
  });

  return NextResponse.json({ isAdmin: admin, reports });
}
