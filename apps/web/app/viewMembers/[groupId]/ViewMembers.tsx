import React from "react";
import prisma from "../../lib/prisma";

interface ViewMembersProps {
  groupId: string;
}

const ViewGroupMembers: React.FC<ViewMembersProps> = async ({ groupId }) => {
  const members = await prisma.groupMember.findMany({
    where: {
      groupId,
    },
    include: {
      user: {
        select: {
          username: true,
          phone: true,
        },
      },
    },
  });

  return (
    <div className="flex flex-col items-center p-6">
      <h1 className="text-3xl font-bold mb-6">Group Members</h1>
      {members.length > 0 ? (
        <ul className="space-y-4 w-full max-w-md">
          {members.map((member) => (
            <li key={member.id} className="p-4 border rounded-lg">
              <strong>Name:</strong> {member.user.username} <br />
              <strong>Phone:</strong> {member.user.phone} <br />
            </li>
          ))}
        </ul>
      ) : (
        <p>No members found.</p>
      )}
    </div>
  );
};

export default ViewGroupMembers;
