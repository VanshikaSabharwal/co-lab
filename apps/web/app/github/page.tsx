"use client";

import React, { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { FaGithub } from "react-icons/fa";
import PageTour from "../components/PageTour";

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
    console.log(selectedRepo);

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
    <div className="min-h-[calc(100vh-56px)] bg-gray-50 dark:bg-gray-950 px-4 py-8 sm:py-10">
      {!session ? (
        <div className="flex flex-col items-center justify-center py-20">
          <button
            onClick={() => signIn("github")}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg hover:opacity-90 transition"
          >
            <FaGithub size={16} /> Login with GitHub to Create Group
          </button>
        </div>
      ) : (
        <div className="w-full max-w-lg mx-auto bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6">
          <PageTour
            storageKey="ko-lab-tour-github"
            steps={[
              {
                id: "github-welcome",
                text: `<strong>Create a Group</strong><br/><br/>
                  Link a GitHub repo to a Ko-Lab group so your team can collaborate with real-time code editing and chat.`,
              },
              {
                id: "github-name",
                attachTo: { element: "#tour-github-name", on: "bottom" },
                text: `<strong>Group name & repo</strong><br/><br/>
                  Enter a name for your group, then pick the GitHub repo you want to link it to.`,
              },
              {
                id: "github-ssh",
                attachTo: { element: "#tour-github-ssh", on: "top" },
                text: `<strong>SSH public key</strong><br/><br/>
                  Run the shell command shown here to generate a key, add it to GitHub, then paste the public key above.
                  Click ℹ️ for step-by-step instructions.`,
              },
              {
                id: "github-create",
                attachTo: { element: "#tour-github-create", on: "top" },
                text: `<strong>Create the group</strong><br/><br/>
                  Once all fields are filled, hit <em>Create Group</em> and your group will be ready.`,
              },
            ]}
          />
          <h2 className="text-xl font-bold mb-5 text-gray-900 dark:text-white">Create Group</h2>

          {/* GROUP NAME INPUT */}
          <div id="tour-github-name">
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Enter group name"
            className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg mb-4 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />

          <select
            className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            onChange={(e) => setSelectedRepo(JSON.parse(e.target.value))}
          >
            <option>Select a repo</option>
            {repos.map((repo) => (
              <option key={repo.id} value={JSON.stringify(repo)}>
                {repo.full_name}
              </option>
            ))}
          </select>
          </div>

          <h3 id="tour-github-ssh" className="text-sm font-semibold mt-5 mb-1 flex items-center gap-2 text-gray-900 dark:text-white">
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
              onClick={() => setShowInfo(false)} // closes modal if clicking outside
            >
              <div
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-5 rounded-xl shadow-lg w-full max-w-sm mx-4 z-50"
                onClick={(e) => e.stopPropagation()} // prevent closing when clicking inside modal
              >
                <h3 className="font-bold text-lg mb-3 text-gray-900 dark:text-white">How to use this?</h3>

                <p className="text-gray-700 dark:text-gray-300 text-sm">
                  1. Copy the above SSH command using the Copy button.
                  <br />
                  2. Open your terminal.
                  <br />
                  3. Paste the command and press <b>Enter</b>.<br />
                  4. This will generate a new SSH key and print the public key.
                  <br />
                  5. Copy the printed public key and go to{" "}
                  <a
                    href="https://github.com/settings/keys"
                    target="_blank"
                    className="underline text-blue-600 hover:text-blue-800"
                  >
                    GitHub → SSH and GPG Keys → New SSH Key
                  </a>
                  .<br />
                  6. Paste the key there and hit <b>Save</b>.<br />
                  <br />
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
          <div className="relative bg-gray-900 text-gray-100 py-6 px-4 mt-3 rounded-lg text-xs font-mono">
            {/* COPY BUTTON */}
            <button
              onClick={() => {
                navigator.clipboard.writeText(
                  `ssh-keygen -t ed25519 -C "${session?.user?.email ?? "youremail@example.com"}"\ncat ~/.ssh/id_ed25519.pub`,
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
            className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg mt-3 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />

          <a
            href={sshToken ? "https://github.com/settings/ssh/new" : undefined}
            onClick={(e) => { if (!sshToken) e.preventDefault(); }}
            target="_blank"
            rel="noopener noreferrer"
            className={`block text-center w-full mt-2 py-2.5 text-sm font-medium rounded-lg text-white transition ${
              sshToken ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-300 dark:bg-gray-700 cursor-not-allowed"
            }`}
          >
            Save SSH key to GitHub
          </a>

          <button
            id="tour-github-create"
            onClick={handleCreateGroup}
            className="mt-3 w-full py-2.5 text-sm font-semibold bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
          >
            Create Group
          </button>
        </div>
      )}
    </div>
  );
}
