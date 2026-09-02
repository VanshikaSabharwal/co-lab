import { NextResponse } from "next/server";
import prisma from "../../lib/prisma";
import { getSessionUser, unauthorized, requireCodeAccess } from "../../lib/apiAuth";

export async function POST(req: Request) {
  const me = await getSessionUser();
  if (!me) return unauthorized();

  const { name, path, content, group, baseSha } = await req.json();

  if (!name || !path || !content || !group) {
    return NextResponse.json(
      { Error: "Missing required fields" },
      { status: 400 },
    );
  }

  // Drafts are the input to a change request branch, so saving one requires the
  // same code access as submitting. Without this, any signed-in user could
  // write drafts into a group they have no access to.
  const gate = await requireCodeAccess(group, me.id);
  if (!gate.ok) return gate.res;

  try {
    const modifiedFile = await prisma.modifiedFiles.upsert({
      where: {
        userId_groupId_path: {
          userId: me.id,
          groupId: group,
          path,
        },
      },
      update: {
        name,
        content,
        updatedAt: new Date(),
        modifiedById: me.id,
        // baseSha intentionally omitted — keep the sha from the first save so
        // the CR branch stays anchored to what the author originally saw.
      },
      create: {
        name,
        path,
        content,
        userId: me.id,
        modifiedById: me.id,
        groupId: group,
        baseSha: baseSha ?? null,
      },
    });

    return NextResponse.json(modifiedFile, { status: 200 });
  } catch (error) {
    console.error("Error saving file: ", error);
    return NextResponse.json({ Error: "Failed to save file" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const me = await getSessionUser();
  if (!me) return unauthorized();

  const { searchParams } = new URL(req.url);
  const group = searchParams.get("group");

  if (!group) {
    return NextResponse.json({ Error: "Group required" }, { status: 400 });
  }

  try {
    const modifiedFiles = await prisma.modifiedFiles.findMany({
      where: {
        groupId: group,
        OR: [{ userId: me.id }, { group: { ownerId: me.id } }],
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(modifiedFiles, { status: 200 });
  } catch (error) {
    console.error("Error fetching files: ", error);
    return NextResponse.json(
      { Error: "Failed to fetch files" },
      { status: 500 },
    );
  }
}
