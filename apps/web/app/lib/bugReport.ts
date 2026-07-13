import { Octokit } from "@octokit/rest";
import { getBaseUrl } from "./githubLink";

// The app owner who sees the admin view. Configurable; defaults to the known
// Ko-Lab owner so the feature works before any env is set.
const ADMIN_EMAIL = (process.env.BUG_ADMIN_EMAIL || "vanshikasabharwal03@gmail.com").toLowerCase();

export function isBugAdmin(email: string | null | undefined): boolean {
  return !!email && email.toLowerCase() === ADMIN_EMAIL;
}

interface IssueInput {
  id: string;
  title: string;
  description: string;
  category: string;
  severity: string;
  url?: string | null;
  userAgent?: string | null;
  reporterName?: string | null;
}

export interface CreatedIssue {
  number: number;
  url: string;
}

// Opens a GitHub issue for a bug report, using a dedicated bot token (reports
// come from any user, so we never use the reporter's token). Returns null and
// logs — never throws — if the env isn't configured or GitHub errors, so the
// report still saves to the DB.
export async function createBugIssue(input: IssueInput): Promise<CreatedIssue | null> {
  const token = process.env.BUG_REPORT_GITHUB_TOKEN;
  const repo = process.env.BUG_REPORT_REPO; // "owner/name"
  if (!token || !repo || !repo.includes("/")) {
    return null; // graceful: GitHub step skipped, DB record still created
  }

  const [owner, name] = repo.split("/");

  const body = [
    input.description,
    "",
    "---",
    `- **Category:** ${input.category}`,
    `- **Severity:** ${input.severity}`,
    `- **Reported by:** ${input.reporterName ?? "a Ko-Lab user"}`,
    input.url ? `- **Page:** ${input.url}` : "",
    input.userAgent ? `- **Browser:** ${input.userAgent}` : "",
    `- **In-app report:** ${getBaseUrl()}/bugs (id \`${input.id}\`)`,
    "",
    "_Filed via the Ko-Lab in-app bug reporter._",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const octokit = new Octokit({ auth: token });
    const res = await octokit.rest.issues.create({
      owner: owner!,
      repo: name!,
      title: `[Bug] ${input.title}`,
      body,
      labels: ["bug-report", `severity:${input.severity.toLowerCase()}`],
    });
    return { number: res.data.number, url: res.data.html_url };
  } catch (err: any) {
    console.error("Bug report → GitHub issue failed:", err.message);
    return null;
  }
}
