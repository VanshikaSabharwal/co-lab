import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "../../../../../../lib/prisma";
import { assertColumnInGroup, badRequest, notFound, requireGroupAccess } from "../../_shared";

const patchColumn = z
  .object({
    title: z.string().trim().min(1).max(80).optional(),
    color: z.string().max(32).nullable().optional(),
    position: z.number().int().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "No fields to update");

type Params = { params: { groupId: string; columnId: string } };

export async function PATCH(req: Request, { params }: Params) {
  const { groupId, columnId } = params;

  const access = await requireGroupAccess(groupId);
  if (access.error) return access.error;

  // The column must belong to the group in the URL — otherwise a member of one
  // group could edit another group's column by pairing the two ids.
  if (!(await assertColumnInGroup(columnId, groupId))) return notFound("Column not found");

  const parsed = patchColumn.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.errors);

  const column = await prisma.planningColumn.update({
    where: { id: columnId },
    data: parsed.data,
    select: { id: true, title: true, position: true, color: true },
  });

  return NextResponse.json(column);
}

export async function DELETE(_req: Request, { params }: Params) {
  const { groupId, columnId } = params;

  const access = await requireGroupAccess(groupId);
  if (access.error) return access.error;

  if (!(await assertColumnInGroup(columnId, groupId))) return notFound("Column not found");

  // Tasks cascade with the column (schema-level onDelete: Cascade).
  await prisma.planningColumn.delete({ where: { id: columnId } });

  return NextResponse.json({ id: columnId });
}
