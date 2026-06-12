"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import Cookies from "js-cookie";
import { FaGithub, FaLink, FaUser, FaInfoCircle } from "react-icons/fa";
import Image from "next/image";

interface GuestData {
  guestId: string;
}

interface Group {
  id: string;
  groupName: string;
  githubRepo: string;
}

export default function CreateGroup() {
  const [groupName, setGroupName] = useState("");
  const [githubRepo, setGithubRepo] = useState("");
  const { data: session } = useSession();
  const [githubOwnerName, setGithubOwnerName] = useState("");
  const [githubAccessToken, setGithubAccessToken] = useState("");
  const ownerId = session?.user?.id;
  const [guestData, setGuestData] = useState<GuestData | null>(null);

  const [groups, setGroups] = useState<Group[]>([]);
  const [showNote, setShowNote] = useState(true);

  const [showImage, setShowImage] = useState<string | null>(null);

  useEffect(() => {
    setShowNote(true);
    const guestId = Cookies.get("guestId");
    if (guestId) {
      setGuestData({ guestId });
    }
  }, []);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!groupName || !githubRepo || !githubOwnerName) {
      toast.error("Please fill in all fields");
      return;
    }

    if (guestData) {
      toast.error("Please Sign Up/Login to send messages");
      return;
    }

    try {
      const response = await fetch("/api/create-group-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupName,
          githubRepo,
          githubOwnerName,
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
        setGithubOwnerName("");
        setGithubAccessToken("");
        toast.success(
          `Group "${newGroup.groupName}" created successfully with ID: ${newGroup.id}`,
        );
      } else {
        const errorData = await response.json();
        toast.error(`Error: ${errorData.error}`);
      }
    } catch (error) {
      toast.error("An error occurred while creating the group");
    }
  };

  const renderInput = (
    label: string,
    value: string,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
    placeholder: string,
    icon: React.ReactNode,
    imageSrc: string,
  ) => (
    <div className="mb-4">
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5 flex items-center">
        {label}
        {icon}
        <FaInfoCircle
          size={18}
          className="ml-2 cursor-pointer text-blue-500 hover:text-blue-600"
          onClick={() => setShowImage(imageSrc)}
        />
      </label>
      <input
        type="text"
        value={value}
        onChange={onChange}
        className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
        placeholder={placeholder}
      />
    </div>
  );

  return (
    <div className="min-h-[calc(100vh-56px)] bg-gray-50 dark:bg-gray-950 px-4 py-8 sm:py-10">
      <div className="w-full max-w-md mx-auto bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-5">Create Group</h1>

        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 border border-blue-200 dark:border-blue-700 rounded-lg mb-5">
          <p className="text-xs text-blue-800 dark:text-blue-300">
            💡 <strong>Tip:</strong> Use the{" "}
            <a
              href="/github"
              className="underline font-semibold hover:text-blue-600"
            >
              GitHub-connected flow
            </a>{" "}
            instead — it auto-fetches your repos so you don't need to enter
            details manually.
          </p>
        </div>

        {showNote && (
          <div className="bg-amber-50 dark:bg-amber-900/20 p-3 border border-amber-200 dark:border-amber-700 rounded-lg mb-5">
            <p className="text-xs text-amber-800 dark:text-amber-300">
              Please ensure all details are valid. Make sure the Group Name
              matches the github repo name. The owner name must be correct, and
              all other details must be accurate for everything to work
              properly.
            </p>
            <button
              onClick={() => setShowNote(false)}
              className="mt-2 px-3 py-1.5 text-xs font-medium bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition"
            >
              Got it
            </button>
          </div>
        )}

        <form onSubmit={handleCreateGroup} className="space-y-1">
          {renderInput(
            "Repo Name:",
            groupName,
            (e) => setGroupName(e.target.value),
            "Enter group name",
            <FaLink className="ml-2" />,
            "/images/Github-1.png",
          )}
          {renderInput(
            "GitHub Repository URL:",
            githubRepo,
            (e) => setGithubRepo(e.target.value),
            "Enter GitHub repository URL",
            <FaGithub className="ml-2" />,
            "/images/Github-1.png",
          )}
          {renderInput(
            "GitHub Owner Name:",
            githubOwnerName,
            (e) => setGithubOwnerName(e.target.value),
            "Enter GitHub owner name",
            <FaUser className="ml-2" />,
            "/images/Github-2.png",
          )}
          {renderInput(
            "GitHub Access Token:",
            githubAccessToken,
            (e) => setGithubAccessToken(e.target.value),
            "Enter GitHub access token",
            null,
            "/images/Github-3.png",
          )}

          <button
            type="submit"
            className="w-full py-2.5 text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition mt-2"
          >
            Create Group
          </button>
        </form>
      </div>

      {showImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setShowImage(null)}
        >
          <div className="relative w-full h-full">
            <Image
              src={showImage}
              alt="Info"
              layout="fill"
              objectFit="contain"
              className="rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
}
