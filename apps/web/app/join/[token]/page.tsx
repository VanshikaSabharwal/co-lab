import Link from "next/link";
import { redirect } from "next/navigation";
import prisma from "../../lib/prisma";
import { getSessionUser } from "../../lib/apiAuth";

/**
 * Redeems a group invite link.
 *
 * Grants **group membership only**. Repository push access remains a separate,
 * explicit action by the owner — otherwise anyone who forwarded the link would
 * be handing out commit rights to the GitHub repo.
 */
export default async function JoinPage({ params }: { params: { token: string } }) {
  const { token } = params;

  const link = await prisma.groupInviteLink.findUnique({
    where: { token },
    select: {
      id: true,
      groupId: true,
      expiresAt: true,
      revokedAt: true,
      group: { select: { groupName: true, ownerId: true } },
    },
  });

  const invalid =
    !link ||
    link.revokedAt !== null ||
    (link.expiresAt !== null && link.expiresAt < new Date());

  if (invalid) {
    return (
      <Message
        title="This invite link isn't valid"
        body="It may have expired or been revoked. Ask the group owner for a fresh link."
      />
    );
  }

  const me = await getSessionUser();
  if (!me) {
    // Come back here after signing in, so the link still works for someone
    // who doesn't have an account yet.
    redirect(`/signin?callbackUrl=${encodeURIComponent(`/join/${token}`)}`);
  }

  // The owner is already in the group by definition and has no GroupMember row.
  if (link.group.ownerId === me.id) {
    redirect(`/group/${link.groupId}`);
  }

  const existing = await prisma.groupMember.findFirst({
    where: { groupId: link.groupId, userId: me.id },
    select: { id: true },
  });

  if (!existing) {
    await prisma.$transaction([
      prisma.groupMember.create({
        data: { groupId: link.groupId, userId: me.id, role: "MEMBER" },
      }),
      prisma.groupInviteLink.update({
        where: { id: link.id },
        data: { usedCount: { increment: 1 } },
      }),
    ]);
  }

  redirect(`/group/${link.groupId}`);
}

function Message({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center p-6">
      <div className="max-w-sm text-center">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{body}</p>
        <Link
          href="/groups"
          className="mt-5 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
        >
          Go to your groups
        </Link>
      </div>
    </div>
  );
}
