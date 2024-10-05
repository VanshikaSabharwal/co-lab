"use client";

import React, { useState, useEffect } from "react";
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
  const [githubOwnerName, setGithubOwnerName] = useState("");
  const [githubAccessToken, setGithubAccessToken] = useState("");
  const ownerId = session?.user.id;

  const [groups, setGroups] = useState<Group[]>([]);
  const [showNote, setShowNote] = useState(true); // State to control note visibility

  // Show a toast note on page load
  useEffect(() => {
    setShowNote(true); // Ensure the note is shown when the component mounts
  }, []);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate fields
    if (!groupName || !githubRepo || !githubOwnerName) {
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
        githubOwnerName, // Include owner name in the request
        githubAccessToken,
        ownerId,
        createdAt: new Date(),
      }),
    });

    if (response.ok) {
      const newGroup = await response.json();
      setGroups((prevGroups) => [...prevGroups, newGroup]);
      setGroupName("");
      setGithubRepo("");
      setGithubOwnerName(""); // Reset owner name
      setGithubAccessToken("");
      alert(
        `Group "${newGroup.groupName}" created successfully with ID: ${newGroup.id}`
      );
    } else {
      const errorData = await response.json();
      alert(`Error: ${errorData.error}`);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-6">
      <h1 className="text-3xl font-bold text-center mb-2">Create Group</h1>

      {/* Note Section */}
      {showNote && (
        <div className="bg-yellow-100 p-4 border border-yellow-300 rounded-md mb-4">
          <p className="text-sm">
            Please ensure all details are valid. The owner name must be correct,
            and all other details must be accurate for everything to work
            properly.
          </p>
          <button
            onClick={() => setShowNote(false)} // Hide the note on button click
            className="mt-2 p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Got It
          </button>
        </div>
      )}

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
          placeholder="Enter GitHub repository URL"
        />
        <label className="text-lg font-bold mb-2">GitHub Owner Name:</label>
        <input
          type="text"
          value={githubOwnerName}
          onChange={(e) => setGithubOwnerName(e.target.value)}
          className="p-2 border rounded-lg mb-4"
          placeholder="Enter GitHub owner name"
        />
        <label className="text-lg font-bold mb-2">GitHub Access Token:</label>
        <input
          type="password"
          value={githubAccessToken}
          onChange={(e) => setGithubAccessToken(e.target.value)}
          className="p-2 border rounded-lg mb-4"
          placeholder="Enter GitHub Access Token"
        />
        <button
          type="submit"
          className="p-3 bg-blue-500 text-white rounded-lg mt-4 hover:bg-blue-600 transition-colors duration-200"
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
                <a
                  href={group.githubRepo}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  GitHub Repo: {group.githubRepo}
                </a>
                <a
                  href={`group/${group.id}`}
                  className="text-blue-500 hover:underline"
                >
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
