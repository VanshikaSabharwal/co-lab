import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "../../../../../lib/prisma";
import { badRequest, isoDate, requireGroupAccess, serializeMilestone } from "../_shared";
import { toDate } from "../_shared";

const createMilestone = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(200),
    startDate: isoDate.optional(),
    // A milestone without a due date can't be placed on the timeline.
    dueDate: isoDate,
    done: z.boolean().optional(),
  })
  .refine((v) => !v.startDate || v.startDate <= v.dueDate, {
    message: "startDate must be on or before dueDate",
    path: ["startDate"],
  });

export async function POST(req: Request, { params }: { params: { groupId: string } }) {
  const { groupId } = params;

  const access = await requireGroupAccess(groupId);
  if (access.error) return access.error;

  const parsed = createMilestone.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return badRequest(parsed.error.errors);
  const body = parsed.data;

  const milestone = await prisma.planningMilestone.create({
    data: {
      groupId,
      title: body.title,
      startDate: body.startDate ? toDate(body.startDate) : null,
      dueDate: toDate(body.dueDate),
      done: body.done ?? false,
    },
    select: { id: true, title: true, startDate: true, dueDate: true, done: true },
  });

  return NextResponse.json(serializeMilestone(milestone), { status: 201 });
}
