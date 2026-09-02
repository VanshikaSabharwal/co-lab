import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "../../../../../lib/prisma";
import {
  assertColumnInGroup,
  assertMilestoneInGroup,
  badRequest,
  filterToGroupMembers,
  isoDate,
  nextTaskPosition,
  notFound,
  requireGroupAccess,
  serializeTask,
  toDate,
  TASK_SELECT,
} from "../_shared";

const createTask = z.object({
  columnId: z.string().min(1),
  // Cards were routinely created blank and titled afterwards, so an empty
  // title is allowed here too.
  title: z.string().max(200).default(""),
  description: z.string().max(5000).optional(),
  startDate: isoDate.optional(),
  dueDate: isoDate.optional(),
  color: z.string().max(32).optional(),
  milestoneId: z.string().optional(),
  assigneeIds: z.array(z.string()).max(20).optional(),
});

export async function POST(req: Request, { params }: { params: { groupId: string } }) {
  const { groupId } = params;

  const access = await requireGroupAccess(groupId);
  if (access.error) return access.error;

  const parsed = createTask.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.errors);
  const body = parsed.data;

  if (!(await assertColumnInGroup(body.columnId, groupId))) return notFound("Column not found");

  if (body.milestoneId && !(await assertMilestoneInGroup(body.milestoneId, groupId))) {
    return notFound("Milestone not found");
  }

  // Only group members can be assigned — otherwise a task could reference a
  // user with no access to the board it lives on.
  const assigneeIds = await filterToGroupMembers(groupId, body.assigneeIds ?? []);

  if (body.startDate && body.dueDate && body.startDate > body.dueDate) {
    return badRequest("startDate must be on or before dueDate");
  }

  const task = await prisma.planningTask.create({
    data: {
      groupId,
      columnId: body.columnId,
      title: body.title,
      description: body.description ?? null,
      position: await nextTaskPosition(body.columnId),
      startDate: body.startDate ? toDate(body.startDate) : null,
      dueDate: body.dueDate ? toDate(body.dueDate) : null,
      color: body.color ?? null,
      milestoneId: body.milestoneId ?? null,
      assignees: { create: assigneeIds.map((userId) => ({ userId })) },
    },
    select: TASK_SELECT,
  });

  return NextResponse.json(serializeTask(task), { status: 201 });
}
