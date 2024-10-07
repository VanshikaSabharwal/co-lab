import prisma from "../lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../lib/auth";

export default async function MyGroups() {
  // Get the session to retrieve the user
  const session = await getServerSession(authOptions);

  if (!session) {
    return (
      <div className="flex flex-col items-center p-6">
        <h1 className="text-3xl font-bold mb-6">Groups</h1>
        <p>Please log in to view your groups.</p>
      </div>
    );
  }

  // Get the current user's ID
  const userId = session.user.id;

  // Fetch groups where the ownerId matches the current userId
  const groups = await prisma.group.findMany({
    where: {
      ownerId: userId, // Filter based on the userId
    },
  });

  return (
    <div className="flex flex-col items-center p-6">
      <h1 className="text-3xl font-bold mb-6">Groups</h1>
      {groups.length > 0 ? (
        <ul className="space-y-4 w-full max-w-md">
          {groups.map((group) => (
            <li key={group.id} className="p-4 border rounded-lg">
              <strong>Group Name:</strong> {group.groupName} <br />
              <strong>GitHub Repo:</strong>{" "}
              <a
                href={group.githubRepo}
                target="_blank"
                className="text-blue-600"
              >
                {group.githubRepo}
              </a>{" "}
              <br />
              <a href={`group/${group.id}`} className="text-blue-600">
                <strong>Group ID:</strong> {group.id}
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p>No groups found.</p>
      )}
    </div>
  );
}
