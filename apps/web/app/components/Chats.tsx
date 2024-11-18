"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import FriendSearch from "../components/FriendSearch";
import Notifications from "./Notifications";
import { motion } from "framer-motion";
import GroupChat from "../group/[groupId]/GroupChat";
import Cookies from "js-cookie";

interface Group {
  id: string;
  name: string;
  members: Array<{ userId: string }>;
  groupName: string;
  githubRepo: string;
}
interface GuestData {
  guestId: string;
}

export default function Component() {
  const { data: session } = useSession();
  const [selectedChat, setSelectedChat] = useState<Group | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [isMobileView, setIsMobileView] = useState(false);
  const [guestData, setGuestData] = useState<GuestData | null>(null);

  const user = session?.user?.id;

  useEffect(() => {
    const guestId = Cookies.get("guestId");
    if (guestId) {
      setGuestData({ guestId });
    }
  }, []);

  // Fetch Groups and Handle Responsive Layout
  useEffect(() => {
    const fetchGroups = async () => {
      if (session?.user?.id || guestData?.guestId) {
        // Check for either session or guest
        try {
          const res = await fetch(`/api/my-groups?userId=${user}`);
          const data = await res.json();
          setGroups(Array.isArray(data.groups) ? data.groups : []);
        } catch (error) {
          console.error("Error fetching groups:", error);
          setGroups([]);
        }
      }
    };
    fetchGroups();

    const handleResize = () => {
      setIsMobileView(window.innerWidth <= 768);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [session, user, guestData]);

  const handleGroupClick = (group: Group) => {
    if (isMobileView) {
      window.location.href = `/group/${group.id}`;
    } else {
      setSelectedChat(group);
    }
  };

  if (!session && !guestData) {
    return (
      <p className="text-center text-gray-400">
        Please Sign In or Use Guest Mode to see chats
      </p>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gradient-to-br from-gray-900 to-black text-white overflow-hidden">
      {/* Sidebar */}
      <div className="w-full md:w-1/4 p-4 bg-gray-800 bg-opacity-50 border-b md:border-r border-gray-700 overflow-y-auto">
        <div className="flex flex-col space-y-4">
          <Notifications />
          <div className="text-sm">
            <p>
              <strong>Email:</strong> {session?.user?.email || "Guest"}
            </p>
            <p>
              <strong>Phone:</strong>{" "}
              {session?.user?.phone || "No phone number"}
            </p>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-300 my-6">Contacts</h1>
        <FriendSearch />
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-gray-400 mb-4">
            My Groups:
          </h2>
          <ul className="space-y-4">
            {groups.map((group) => (
              <li
                key={group.id}
                onClick={() => handleGroupClick(group)}
                className="p-4 bg-gray-700 rounded-md cursor-pointer transition-all duration-300 hover:shadow-lg hover:bg-gray-600"
              >
                <strong>Group Name:</strong> {group.groupName} <br />
                <a
                  href={group.githubRepo}
                  className="text-blue-400 underline hover:text-blue-500"
                  onClick={(e) => e.stopPropagation()}
                >
                  GitHub Repo
                </a>
              </li>
            ))}
          </ul>
        </div>
        {/* Guest User Section */}
        {guestData && (
          <div className="mt-8 p-4 bg-gray-700 rounded-md">
            <p className="text-sm text-gray-300">
              Welcome, Guest! Your ID: <strong>{guestData.guestId}</strong>
            </p>
          </div>
        )}
      </div>

      {/* Chat Area */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full md:w-3/4 p-4 bg-gray-900 flex flex-col justify-between h-full hidden md:block"
      >
        {selectedChat ? (
          <GroupChat group={selectedChat.id} />
        ) : (
          <div className="text-gray-300 text-lg text-center mt-10">
            Select a group to start chatting
          </div>
        )}
      </motion.div>
    </div>
  );
}
