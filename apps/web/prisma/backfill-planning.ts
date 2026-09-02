/**
 * One-off: copies every legacy PLANNING WorkspaceBoard blob into the relational
 * planning tables.
 *
 *   npx tsx prisma/backfill-planning.ts --dry-run   # report only, no writes
 *   npx tsx prisma/backfill-planning.ts
 *
 * Safe to re-run: a group that already has planning rows is skipped, so a
 * partial run can be resumed. The source WorkspaceBoard rows are never
 * modified or deleted — rollback is dropping the new tables.
 */
import { PrismaClient } from "@prisma/client";
import {
  buildBackfillPlan,
  DEFAULT_COLUMNS,
  POSITION_STEP,
  type LegacyPlanningContent,
} from "../app/workspace/lib/planningBackfill";

const prisma = new PrismaClient();
const DRY_RUN = process.argv.includes("--dry-run");

/** UI dates are YYYY-MM-DD; midday UTC keeps them on the same calendar day. */
function toDate(iso: string): Date {
  return new Date(`${iso}T12:00:00Z`);
}

async function main() {
  const boards = await prisma.workspaceBoard.findMany({ where: { type: "PLANNING" } });
  console.log(`${boards.length} legacy PLANNING board(s)\n`);

  let migrated = 0;
  let skipped = 0;
  let seeded = 0;
  const warnings: string[] = [];

  for (const board of boards) {
    const { groupId } = board;

    const existing = await prisma.planningColumn.count({ where: { groupId } });
    if (existing > 0) {
      console.log(`· ${groupId}: already has ${existing} column(s) — skipping`);
      skipped += 1;
      continue;
    }

    const plan = buildBackfillPlan(board.content as LegacyPlanningContent);

    if (plan.orphanedCardIds.length) {
      warnings.push(
        `${groupId}: ${plan.orphanedCardIds.length} card id(s) referenced by a column but missing from cards — dropped: ${plan.orphanedCardIds.join(", ")}`,
      );
    }

    // A board that was never edited has no columns server-side, because the old
    // client seeded its three defaults locally and only persisted on first
    // change. Seed the mockup's four so the group opens onto a usable board.
    if (plan.columns.length === 0) {
      console.log(`· ${groupId}: empty board — seeding ${DEFAULT_COLUMNS.length} default columns`);
      if (!DRY_RUN) {
        await prisma.planningColumn.createMany({
          data: DEFAULT_COLUMNS.map((c, i) => ({
            groupId,
            title: c.title,
            color: c.color,
            position: i * POSITION_STEP,
          })),
        });
      }
      seeded += 1;
      continue;
    }

    console.log(
      `· ${groupId}: ${plan.columns.length} column(s), ${plan.tasks.length} task(s), ${plan.milestones.length} milestone(s)`,
    );

    if (DRY_RUN) {
      migrated += 1;
      continue;
    }

    // One transaction per group: a group is either fully migrated or untouched,
    // never half-written.
    await prisma.$transaction(async (tx) => {
      const milestoneIds = new Map<string, string>();
      for (const m of plan.milestones) {
        const row = await tx.planningMilestone.create({
          data: {
            groupId,
            title: m.title,
            startDate: m.startDate ? toDate(m.startDate) : null,
            dueDate: toDate(m.dueDate),
            done: m.done,
          },
        });
        milestoneIds.set(m.legacyId, row.id);
      }

      const columnIds = new Map<string, string>();
      for (const [i, c] of plan.columns.entries()) {
        const row = await tx.planningColumn.create({
          data: {
            groupId,
            title: c.title,
            position: c.position,
            color: DEFAULT_COLUMNS[i % DEFAULT_COLUMNS.length]!.color,
          },
        });
        columnIds.set(c.legacyId, row.id);
      }

      for (const t of plan.tasks) {
        const columnId = columnIds.get(t.legacyColumnId);
        if (!columnId) continue; // unreachable: tasks only come from known columns
        await tx.planningTask.create({
          data: {
            groupId,
            columnId,
            title: t.title,
            description: t.description,
            position: t.position,
            milestoneId: t.legacyMilestoneId
              ? (milestoneIds.get(t.legacyMilestoneId) ?? null)
              : null,
          },
        });
      }
    });

    migrated += 1;
  }

  console.log(
    `\n${DRY_RUN ? "[dry run] would migrate" : "migrated"} ${migrated}, seeded ${seeded}, skipped ${skipped}`,
  );
  if (warnings.length) {
    console.log(`\n${warnings.length} warning(s):`);
    for (const w of warnings) console.log(`  ! ${w}`);
  }
  if (DRY_RUN) console.log("\nNo changes were written. Re-run without --dry-run to apply.");
}

main()
  .catch((err) => {
    console.error("Backfill failed — no partial group was committed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
