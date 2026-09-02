import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "../../../../../../lib/prisma";
import {
  assertMilestoneInGroup,
  badRequest,
  isoDate,
  notFound,
  requireGroupAccess,
  serializeMilestone,
  toDate,
  toISO,
} from "../../_shared";

const patchMilestone = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    startDate: isoDate.nullable().optional(),
    dueDate: isoDate.optional(),
    done: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "No fields to update");

type Params = { params: { groupId: string; milestoneId: string } };

export async function PATCH(req: Request, { params }: Params) {
  const { groupId, milestoneId } = params;

  const access = await requireGroupAccess(groupId);
  if (access.error) return access.error;

  if (!(await assertMilestoneInGroup(milestoneId, groupId))) return notFound("Milestone not found");

  const parsed = patchMilestone.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.errors);
  const body = parsed.data;

  // Check the resulting range, since either end may be moving on its own.
  const current = await prisma.planningMilestone.findUnique({
    where: { id: milestoneId },
    select: { startDate: true, dueDate: true },
  });
  const nextStart =
    body.startDate === undefined ? toISO(current?.startDate ?? null) : body.startDate;
  const nextDue = body.dueDate ?? toISO(current?.dueDate ?? null);
  if (nextStart && nextDue && nextStart > nextDue) {
    return badRequest("startDate must be on or before dueDate");
  }

  const milestone = await prisma.planningMilestone.update({
    where: { id: milestoneId },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.startDate !== undefined && {
        startDate: body.startDate ? toDate(body.startDate) : null,
      }),
      ...(body.dueDate !== undefined && { dueDate: toDate(body.dueDate) }),
      ...(body.done !== undefined && { done: body.done }),
    },
    select: { id: true, title: true, startDate: true, dueDate: true, done: true },
  });

  return NextResponse.json(serializeMilestone(milestone));
}

export async function DELETE(_req: Request, { params }: Params) {
  const { groupId, milestoneId } = params;

  const access = await requireGroupAccess(groupId);
  if (access.error) return access.error;

  if (!(await assertMilestoneInGroup(milestoneId, groupId))) return notFound("Milestone not found");

  // Tasks survive: milestoneId is SetNull, so deleting a milestone unlinks its
  // tasks rather than destroying work.
  await prisma.planningMilestone.delete({ where: { id: milestoneId } });

  return NextResponse.json({ id: milestoneId });
}
