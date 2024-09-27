import prisma from "../lib/prisma";

export default async function MyGroups() {
  const groups = await prisma.group.findMany();

  return (
    <div className="flex flex-col items-center p-6">
      <h1 className="text-3xl font-bold mb-6"> Groups</h1>
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
                {" "}
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
