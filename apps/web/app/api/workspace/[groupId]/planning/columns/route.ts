import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "../../../../../lib/prisma";
import { badRequest, nextColumnPosition, requireGroupAccess } from "../_shared";

const createColumn = z.object({
  title: z.string().trim().min(1, "Title is required").max(80),
  color: z.string().max(32).optional(),
});

export async function POST(req: Request, { params }: { params: { groupId: string } }) {
  const { groupId } = params;

  const access = await requireGroupAccess(groupId);
  if (access.error) return access.error;

  const parsed = createColumn.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.errors);

  const column = await prisma.planningColumn.create({
    data: {
      groupId,
      title: parsed.data.title,
      color: parsed.data.color ?? null,
      position: await nextColumnPosition(groupId),
    },
    select: { id: true, title: true, position: true, color: true },
  });

  return NextResponse.json({ ...column, taskIds: [] }, { status: 201 });
}
