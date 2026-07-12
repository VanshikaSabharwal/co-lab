import { NextResponse } from "next/server";
import prisma from "../../../../lib/prisma";
import { getSessionUser, isGroupMember, unauthorized, forbidden } from "../../../../lib/apiAuth";

const SLUG_TO_TYPE: Record<string, "MIND_MAP" | "PLANNING" | "DB_SCHEMA" | "UI_DESIGN"> = {
  "mind-map": "MIND_MAP",
  "planning": "PLANNING",
  "db-schema": "DB_SCHEMA",
  "ui-design": "UI_DESIGN",
};

const DEFAULT_CONTENT: Record<string, unknown> = {
  MIND_MAP: { nodes: [], edges: [] },
  DB_SCHEMA: { nodes: [], edges: [] },
  UI_DESIGN: { nodes: [], edges: [] },
  PLANNING: { columns: [], cards: {}, milestones: [] },
};

export async function GET(
  req: Request,
  { params }: { params: { groupId: string; type: string } },
) {
  const { groupId, type: slug } = params;
  const type = SLUG_TO_TYPE[slug];
  if (!type) {
    return NextResponse.json({ error: "Invalid workspace board type" }, { status: 400 });
  }

  const me = await getSessionUser();
  if (!me) return unauthorized();

  if (!(await isGroupMember(groupId, me.id))) {
    return forbidden("Not a member of this group");
  }

  const board = await prisma.workspaceBoard.findUnique({
    where: { groupId_type: { groupId, type } },
  });

  return NextResponse.json({
    content: board?.content ?? DEFAULT_CONTENT[type],
    updatedAt: board?.updatedAt ?? null,
  });
}

export async function PUT(
  req: Request,
  { params }: { params: { groupId: string; type: string } },
) {
  const { groupId, type: slug } = params;
  const type = SLUG_TO_TYPE[slug];
  if (!type) {
    return NextResponse.json({ error: "Invalid workspace board type" }, { status: 400 });
  }

  const me = await getSessionUser();
  if (!me) return unauthorized();

  const { content } = await req.json();
  if (content === undefined) {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }

  if (!(await isGroupMember(groupId, me.id))) {
    return forbidden("Not a member of this group");
  }

  const board = await prisma.workspaceBoard.upsert({
    where: { groupId_type: { groupId, type } },
    update: { content },
    create: { groupId, type, content },
  });

  return NextResponse.json({ content: board.content, updatedAt: board.updatedAt });
}
