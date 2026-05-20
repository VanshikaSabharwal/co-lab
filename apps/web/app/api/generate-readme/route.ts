import { NextResponse } from "next/server";
import prisma from "../../lib/prisma";
import crypto from "crypto";

const ENCRYPTION_KEY_HEX =
  process.env.ENCRYPTION_KEY ||
  "238d654b1ee39c0663cf2bb6602315cdbc48c322b3a06f50a90e92248468b743";

const ENCRYPTION_KEY = Buffer.from(ENCRYPTION_KEY_HEX, "hex");

function extractRepoName(repo: string): string {
  const urlMatch = repo.match(/github\.com\/[^/]+\/([^/]+?)(?:\.git)?$/);
  if (urlMatch && urlMatch[1]) return urlMatch[1];
  const parts = repo.replace(/\.git$/, "").split("/");
  return parts[parts.length - 1] || repo;
}

function decrypt(encryptedText: string): string {
  const parts = encryptedText.split(":");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error("Invalid encrypted text format");
  }
  const [ivHex, encryptedData] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const key = ENCRYPTION_KEY as unknown as crypto.CipherKey;
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv as any);
  let decrypted = decipher.update(encryptedData, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

async function fetchRepoFileTree(
  owner: string,
  repo: string,
  token: string,
): Promise<{ path: string; name: string }[]> {
  const files: { path: string; name: string }[] = [];

  async function walk(dir: string = "") {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${dir}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!res.ok) return;

    const data = await res.json();
    if (!Array.isArray(data)) return;

    for (const item of data) {
      if (item.type === "file") {
        files.push({ path: item.path, name: item.name });
      } else if (item.type === "dir") {
        await walk(item.path);
      }
    }
  }

  await walk();
  return files;
}

async function fetchFileContent(
  owner: string,
  repo: string,
  path: string,
  token: string,
): Promise<string> {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github.v3+json",
    },
  });

  if (!res.ok) return "";

  const data = await res.json();
  if (data.encoding === "base64" && data.content) {
    return Buffer.from(data.content, "base64").toString("utf-8");
  }
  return "";
}

export async function POST(req: Request) {
  try {
    const { groupId } = await req.json();

    if (!groupId) {
      return NextResponse.json(
        { error: "groupId is required" },
        { status: 400 },
      );
    }

    const groupDetails = await prisma.group.findUnique({
      where: { id: groupId },
      select: {
        githubRepo: true,
        ownerName: true,
        githubAccessToken: true,
      },
    });

    if (!groupDetails) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const { ownerName, githubAccessToken } = groupDetails;
    let githubRepo = extractRepoName(groupDetails.githubRepo);

    const decryptedToken = decrypt(githubAccessToken);

    const fileTree = await fetchRepoFileTree(ownerName, githubRepo, decryptedToken);
    const filePaths = fileTree.map((f) => f.path);

    let projectContext = "## File Structure\n";
    projectContext += filePaths.join("\n") + "\n\n";

    const importantFiles = [
      "package.json",
      "README.md",
      "requirements.txt",
      "Cargo.toml",
      "go.mod",
      "Gemfile",
      "Dockerfile",
      "docker-compose.yml",
      "Makefile",
      "setup.py",
      "pyproject.toml",
      "index.js",
      "index.ts",
      "app.js",
      "main.py",
      "main.go",
      "main.rs",
      "composer.json",
    ];

    for (const impFile of importantFiles) {
      if (filePaths.includes(impFile)) {
        const content = await fetchFileContent(
          ownerName,
          githubRepo,
          impFile,
          decryptedToken,
        );
        if (content) {
          const truncated =
            content.length > 3000
              ? content.slice(0, 3000) + "\n... (truncated)"
              : content;
          projectContext += `### ${impFile}\n\`\`\`\n${truncated}\n\`\`\`\n\n`;
        }
      }
    }

    const titleMatch = githubRepo.match(/[^/]+$/);
    const projectName = titleMatch ? titleMatch[0] : githubRepo;

    const prompt = `You are a technical documentation expert. Generate a comprehensive README.md for a GitHub project called "${projectName}" based on the following file structure and key file contents.

${projectContext}

Generate a complete README.md with these sections (if relevant):
1. Project title and brief description
2. Features
3. Tech stack
4. Prerequisites
5. Installation/setup instructions
6. Usage
7. Project structure overview
8. Contributing guidelines
9. License

Use proper markdown formatting. Be concise but thorough. Return ONLY the README markdown content, no explanation.`;

    let readmeContent = "";

    if (process.env.GROQ_API_KEY) {
      const response = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 4096,
            temperature: 0.5,
          }),
        },
      );

      if (!response.ok) {
        const err = await response.text();
        console.error("Groq API error:", err);
        throw new Error("AI generation failed");
      }

      const data = await response.json();
      readmeContent = data.choices?.[0]?.message?.content || "";
    } else {
      readmeContent = `# ${projectName}

## Tech Stack
Based on the file structure: ${filePaths.length} files detected.

## Project Structure
\`\`\`
${filePaths.slice(0, 50).join("\n")}
${filePaths.length > 50 ? `\n... and ${filePaths.length - 50} more files` : ""}
\`\`\`

## Setup
1. Clone the repository
2. Install dependencies: \`npm install\` (or equivalent)
3. Configure environment variables
4. Run the project

## License
MIT
`;
    }

    return NextResponse.json(
      {
        content: readmeContent,
        fileName: "README.md",
        path: "README.md",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error generating README:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate README",
      },
      { status: 500 },
    );
  }
}
