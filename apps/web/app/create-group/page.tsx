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
          `Group "${newGroup.groupName}" created successfully with ID: ${newGroup.id}`
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
    imageSrc: string
  ) => (
    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
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
        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        placeholder={placeholder}
      />
    </div>
  );

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gray-100">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-3xl font-bold text-center mb-6">Create Group</h1>

        {showNote && (
          <div className="bg-yellow-100 p-4 border border-yellow-300 rounded-md mb-6">
            <p className="text-sm text-yellow-800">
              Please ensure all details are valid. Make sure the Group Name
              matches the github repo name. The owner name must be correct, and
              all other details must be accurate for everything to work
              properly.
            </p>
            <button
              onClick={() => setShowNote(false)}
              className="mt-2 p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition duration-300"
            >
              Got It
            </button>
          </div>
        )}

        <form onSubmit={handleCreateGroup} className="space-y-6">
          {renderInput(
            "Repo Name:",
            groupName,
            (e) => setGroupName(e.target.value),
            "Enter group name",
            <FaLink className="ml-2" />,
            "/images/Github-1.png"
          )}
          {renderInput(
            "GitHub Repository URL:",
            githubRepo,
            (e) => setGithubRepo(e.target.value),
            "Enter GitHub repository URL",
            <FaGithub className="ml-2" />,
            "/images/Github-1.png"
          )}
          {renderInput(
            "GitHub Owner Name:",
            githubOwnerName,
            (e) => setGithubOwnerName(e.target.value),
            "Enter GitHub owner name",
            <FaUser className="ml-2" />,
            "/images/Github-2.png"
          )}
          {renderInput(
            "GitHub Access Token:",
            githubAccessToken,
            (e) => setGithubAccessToken(e.target.value),
            "Enter GitHub access token",
            null,
            "/images/Github-.png"
          )}

          <button
            type="submit"
            className="w-full p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition duration-300"
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
