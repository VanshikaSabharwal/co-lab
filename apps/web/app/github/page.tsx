"use client";

import React, { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { FaGithub } from "react-icons/fa";

type GithubRepo = {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  owner: {
    login: string;
  };
};

export default function GithubGroupCreateLogin() {
  const { data: session } = useSession();
  const [repos, setRepos] = useState<GithubRepo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<GithubRepo | null>(null);
  const [sshToken, setSshToken] = useState("");
  const [groupName, setGroupName] = useState("");
  const [showInfo, setShowInfo] = useState(false);


  const fetchRepos = async () => {
    if (!session?.user?.accessToken) return;

    try {
      const res = await fetch("https://api.github.com/user/repos", {
        headers: { Authorization: `Bearer ${session.user.accessToken}` },
      });

      const data = await res.json();
      setRepos(data);
    } catch {
      toast.error("Failed to load repos");
    }
  };

  useEffect(() => {
    fetchRepos();
  }, [session]);

  const handleCreateGroup = async () => {
    if (!selectedRepo || !sshToken || !groupName.trim()) {
      toast.error("Group name, Repo and SSH key are required");
      return;
    }
    console.log(selectedRepo)

    try {
      const ownerName = selectedRepo.full_name.split("/")[0];

      const response = await fetch("/api/create-group-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupName,                                
          githubRepo: selectedRepo.name,
          githubOwnerName: ownerName,
          githubRepoUrl: selectedRepo.html_url,
          githubAccessToken: session?.user?.accessToken,
          ownerId: session?.user?.id,
          sshKey: sshToken,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`Group created successfully ✨`);
        setGroupName("");
        setSshToken("");
        setSelectedRepo(null);
      } else {
        toast.error(`Error: ${data.error}`);
      }
    } catch {
      toast.error("Failed to create group");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gray-100">
      {!session ? (
        <button
          onClick={() => signIn("github")}
          className="flex items-center gap-2 p-3 bg-black text-white rounded-lg hover:bg-gray-900"
        >
          <FaGithub size={20} /> Login with GitHub to Create Group
        </button>
      ) : (
  <div className="w-full max-w-md sm:max-w-lg md:max-w-2xl lg:max-w-3xl bg-white rounded-xl shadow-lg p-8">
    <h2 className="text-xl font-bold mb-4">Create Group</h2>

          {/* GROUP NAME INPUT */}
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Enter Group Name"
            className="w-full p-3 border rounded-lg mb-4"
          />

          <select
            className="w-full p-3 border rounded-lg bg-gray-100"
            onChange={(e) => setSelectedRepo(JSON.parse(e.target.value))}
          >
            <option>Select a repo</option>
            {repos.map((repo) => (
              <option key={repo.id} value={JSON.stringify(repo)}>
                {repo.full_name}
              </option>
            ))}
          </select>

<h3 className="font-semibold mt-6 flex items-center gap-2">
  Enter SSH Public Key
  <button
    onClick={() => setShowInfo(true)}
    className="text-s px-2 py-1 rounded hover:bg-grey-700"
  >
    ℹ️
  </button>
</h3>



{showInfo && (
  <div
    className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50"
    onClick={() => setShowInfo(false)}   // closes modal if clicking outside
  >
    <div
      className="bg-white p-6 rounded-lg shadow-lg w-96 z-50"
      onClick={(e) => e.stopPropagation()} // prevent closing when clicking inside modal
    >
      <h3 className="font-bold text-lg mb-3">How to use this?</h3>

      <p className="text-gray-700 text-sm">
        1. Copy the above SSH command using the Copy button.<br />
        2. Open your terminal.<br />
        3. Paste the command and press <b>Enter</b>.<br />
        4. This will generate a new SSH key and print the public key.<br />
        5. Copy the printed public key and go to{" "}
        <a
          href="https://github.com/settings/keys"
          target="_blank"
          className="underline text-blue-600 hover:text-blue-800"
        >
          GitHub → SSH and GPG Keys → New SSH Key
        </a>
        .<br />
        6. Paste the key there and hit <b>Save</b>.<br /><br />
      </p>

      <button
        onClick={() => setShowInfo(false)}
        className="mt-4 w-full p-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Got it
      </button>
    </div>
  </div>
)}
{/* SSH COMMAND BOX */}
<div className="relative bg-gray-800 text-white py-8 px-4 mt-4 rounded-lg text-sm">

  {/* COPY BUTTON */}
  <button
    onClick={() => {
      navigator.clipboard.writeText(
        `ssh-keygen -t ed25519 -C "${session?.user?.email ?? "youremail@example.com"}"\ncat ~/.ssh/id_ed25519.pub`
      );
      toast.success("Copied to clipboard!");
    }}
    className="absolute top-2 right-2 text-xs px-2 py-1 bg-gray-600 rounded hover:bg-gray-700"
  >
    Copy
  </button>
 

<pre className="whitespace-pre-wrap break-all">
{`ssh-keygen -t ed25519 -C "${session?.user?.email ?? "youremail@example.com"}"
cat ~/.ssh/id_ed25519.pub`}
</pre>

</div>

<input
  type="text"
  value={sshToken}
  onChange={(e) => setSshToken(e.target.value)}
  placeholder="Paste SSH public key here"
  className="w-full p-3 border rounded-lg mt-2"
/>

{/* Save SSH key to GitHub */}
<a
  href={sshToken ? "https://github.com/settings/ssh/new" : undefined}
  onClick={(e) => {
    if (!sshToken) e.preventDefault(); // block click
  }}
  target="_blank"
  rel="noopener noreferrer"
  className={`block text-center w-full mt-2 p-2 rounded-lg text-white transition duration-300 ${
    sshToken ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-400 cursor-not-allowed"
  }`}
>
  Save this SSH key to GitHub
</a>








          <button
            onClick={handleCreateGroup}
            className="mt-6 w-full p-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition duration-300"
          >
           Create Group
          </button>
        </div>
      )}
    </div>
  );
}