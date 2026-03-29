import prisma from "../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../lib/auth";
import Link from "next/link";

export default async function MyGroups() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return (
      <div className="min-h-[calc(100vh-56px)] flex flex-col items-center justify-center px-4 bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white">
        <p className="text-sm text-gray-500 dark:text-gray-400">Please sign in to view your groups.</p>
      </div>
    );
  }

  const userId = session.user.id;

  const groups = await prisma.group.findMany({
    where: {
      OR: [
        { ownerId: userId },
        { members: { some: { userId } } },
      ],
    },
    include: {
      members: { include: { user: true } },
    },
  });

  return (
    <div className="min-h-[calc(100vh-56px)] bg-gray-50 dark:bg-gray-950 px-4 py-8 sm:py-10">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-6">My Groups</h1>

        {groups.length > 0 ? (
          <ul className="space-y-3">
            {groups.map((group) => (
              <li
                key={group.id}
                className="p-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {group.groupName}
                    </p>
                    <a
                      href={group.githubRepo}
                      target="_blank"
                      className="text-xs text-blue-500 hover:underline truncate block mt-0.5"
                    >
                      {group.githubRepo}
                    </a>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full flex-shrink-0 ${
                    group.ownerId === userId
                      ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                      : "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400"
                  }`}>
                    {group.ownerId === userId ? "Owner" : "Member"}
                  </span>
                </div>
                <Link
                  href={`/group/${group.id}`}
                  className="inline-block mt-3 text-xs font-medium text-blue-500 hover:underline"
                >
                  Open group chat →
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-16 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">You have no groups yet.</p>
            <Link
              href="/github"
              className="text-sm font-medium text-blue-500 hover:underline"
            >
              Create your first group →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
