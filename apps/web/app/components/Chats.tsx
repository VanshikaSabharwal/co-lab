"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import FriendSearch from "../components/FriendSearch";
import Notifications from "./Notifications";
import { motion } from "framer-motion";
import GroupChat from "../group/[groupId]/GroupChat";
import PageTour from "./PageTour";

interface Group {
  ownerName: string;
  id: string;
  name: string;
  members: Array<{ userId: string }>;
  groupName: string;
  githubRepo: string;
}

export default function Component() {
  const { data: session, status } = useSession();
  const [selectedChat, setSelectedChat] = useState<Group | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [isMobileView, setIsMobileView] = useState(false);

  const userId = session?.user?.id;
  console.log("groups", groups);

  useEffect(() => {
    if (!userId) return;

    const fetchGroups = async () => {
      try {
        const res = await fetch(`/api/my-groups?userId=${userId}`);
        const data = await res.json();
        setGroups(Array.isArray(data.groups) ? data.groups : []);
      } catch (error) {
        console.error("Error fetching groups:", error);
        setGroups([]);
      }
    };
    fetchGroups();

    const handleResize = () => {
      setIsMobileView(window.innerWidth <= 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [userId]);

  const handleGroupClick = (group: Group) => {
    if (isMobileView) {
      // Optional: use router.push instead of full reload
      window.location.href = `/group/${group.id}`;
    } else {
      setSelectedChat(group);
    }
  };

  if (status === "loading") {
    return <p className="text-center text-gray-400">Loading...</p>;
  }

  if (!session) {
    return (
      <p className="text-center text-gray-400">Please Sign In to see chats</p>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-56px)] bg-gradient-to-br from-gray-100 to-white dark:from-gray-900 dark:to-black text-gray-900 dark:text-white overflow-hidden">
      <PageTour
        storageKey="ko-lab-tour-chatroom"
        steps={[
          {
            id: "chatroom-welcome",
            text: `<strong>Welcome to the Chat Room!</strong><br/><br/>
              This is your collaboration hub — find contacts, join group chats, and see notifications all in one place.`,
          },
          {
            id: "chatroom-profile",
            attachTo: { element: "#tour-chatroom-profile", on: "right" },
            text: `<strong>Your profile & notifications</strong><br/><br/>
              See your name, email and any pending notifications at a glance.`,
          },
          {
            id: "chatroom-search",
            attachTo: { element: "#tour-chatroom-search", on: "right" },
            text: `<strong>Find a contact</strong><br/><br/>
              Search for a friend by phone number to start a one-on-one chat.`,
          },
          {
            id: "chatroom-groups",
            attachTo: { element: "#tour-chatroom-groups", on: "right" },
            text: `<strong>Your groups</strong><br/><br/>
              Click any group to open its chat. On mobile you'll be taken to the group page directly.`,
          },
          {
            id: "chatroom-area",
            attachTo: { element: "#tour-chatroom-area", on: "left" },
            text: `<strong>Chat area</strong><br/><br/>
              Select a group from the sidebar and messages will appear here in real time.`,
          },
        ]}
      />

      {/* Sidebar */}
      <div className="w-full md:w-1/4 p-4 bg-gray-200 dark:bg-gray-800 bg-opacity-50 border-b md:border-r border-gray-300 dark:border-gray-700 overflow-y-auto">
        <div id="tour-chatroom-profile" className="flex flex-col space-y-4">
          <Notifications />
          <div className="text-sm">
            <p>
              <strong>Name:</strong> {session.user?.name || "No Name"}
            </p>
            <p>
              <strong>Email:</strong> {session.user?.email || "No Email"}
            </p>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-700 dark:text-gray-300 my-6">Contacts</h1>
        <div id="tour-chatroom-search">
          <FriendSearch />
        </div>

        <div id="tour-chatroom-groups" className="mt-8">
          <h2 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-4">
            My Groups:
          </h2>
          <ul className="space-y-4">
            {groups.map((group) => (
              <li
                key={group.id}
                onClick={() => handleGroupClick(group)}
                className="p-4 bg-gray-300 dark:bg-gray-700 rounded-md cursor-pointer transition-all duration-300 hover:shadow-lg hover:bg-gray-400 dark:hover:bg-gray-600"
              >
                <strong>Group Name:</strong> {group.groupName} <br />
                <a
                  href={`https://github.com/${group.ownerName}/${group.githubRepo}`}
                  className="text-blue-400 underline hover:text-blue-500"
                  onClick={(e) => e.stopPropagation()}
                >
                  GitHub Repo
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Chat Area */}
      <motion.div
        id="tour-chatroom-area"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full md:w-3/4 p-4 bg-gray-50 dark:bg-gray-900 flex flex-col justify-between h-full hidden md:block"
      >
        {selectedChat ? (
          <GroupChat group={selectedChat.id} />
        ) : (
          <div className="text-gray-500 dark:text-gray-300 text-lg text-center mt-10">
            Select a group to start chatting
          </div>
        )}
      </motion.div>
    </div>
  );
}
