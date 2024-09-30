"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";

interface Group {
  id: string;
  groupName: string;
  githubRepo: string;
}

const CreateGroup = () => {
  const [groupName, setGroupName] = useState("");
  const [githubRepo, setGithubRepo] = useState("");
  const { data: session } = useSession();
  const ownerId = session?.user.id;

  const [groups, setGroups] = useState<Group[]>([]);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!groupName || !githubRepo) {
      alert("Please fill in all fields");
      return;
    }

    const response = await fetch("/api/create-group-data", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        groupName,
        githubRepo,
        ownerId,
        createdAt: new Date(),
      }),
    });

    if (response.ok) {
      const newGroup = await response.json();
      setGroups((prevGroups) => [...prevGroups, newGroup]);
      setGroupName("");
      setGithubRepo("");
      alert(
        `Group "${newGroup.groupName}" created successfully with ID: ${newGroup.id}`
      ); // Use newGroup.groupName instead of newGroup.name
    } else {
      const errorData = await response.json();
      alert(`Error: ${errorData.error}`);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-6">
      <h1 className="text-3xl font-bold text-center mb-2">Create Group</h1>
      <form
        onSubmit={handleCreateGroup}
        className="flex flex-col w-full max-w-md"
      >
        <label className="text-lg font-bold mb-2">Group Name:</label>
        <input
          type="text"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          className="p-2 border rounded-lg mb-4"
          placeholder="Enter group name"
        />
        <label className="text-lg font-bold mb-2">GitHub Repository URL:</label>
        <input
          type="text"
          value={githubRepo}
          onChange={(e) => setGithubRepo(e.target.value)}
          className="p-2 border rounded-lg mb-4"
          placeholder="Enter github repository URL"
        />
        <button
          type="submit"
          className="p-3 bg-blue-500 text-white rounded-lg mt-4"
        >
          Make Group
        </button>
      </form>
      {groups.length > 0 && (
        <div className="mt-8 w-full max-w-md">
          <h2 className="text-xl font-bold mb-4">Created Groups:</h2>
          <ul className="space-y-4">
            {groups.map((group) => (
              <li key={group.id} className="p-4 border rounded-lg">
                <strong>Group Name:</strong> {group.groupName} <br />
                <a href={group.githubRepo}>GitHub Repo:{group.githubRepo}</a>
                <a href={`group/${group.id}`}>
                  {" "}
                  <strong>Group ID:</strong> {group.id}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CreateGroup;
