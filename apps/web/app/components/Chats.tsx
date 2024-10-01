"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import FriendSearch from "../components/FriendSearch";

// Example contact list with phone numbers
const contacts = [
  { id: "1", name: "Contact 1", phone: "123-456-7890" },
  { id: "2", name: "Contact 2", phone: "234-567-8901" },
  { id: "3", name: "Contact 3", phone: "345-678-9012" },
];

interface Group {
  id: string;
  name: string;
  members: Array<{ userId: string }>;
  groupName: string;
  githubRepo: string;
}

const ChatApp = () => {
  const { data: session } = useSession();
  const [selectedChat, setSelectedChat] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const user = session?.user.id;
  const [groups, setGroups] = useState<Group[]>([]);

  // fetch all groups in which user is either a member or owner
  useEffect(() => {
    const fetchGroups = async () => {
      if (session?.user?.id) {
        try {
          const res = await fetch(`/api/my-groups?userId=${user}`);
          const data = await res.json();
          // Ensure data.groups is an array
          setGroups(Array.isArray(data.groups) ? data.groups : []);
        } catch (error) {
          console.error("Error fetching groups:", error);
          setGroups([]); // Set to empty array on error
        }
      }
    };
    fetchGroups();
  }, [session]);

  // Filter contacts based on search term
  const filteredContacts = contacts.filter(
    (contact) =>
      contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.phone.includes(searchTerm)
  );

  return session ? (
    <div className="flex h-screen ">
      {/* Left side: Contact List */}
      <div className="w-full md:w-1/4 text-black-500 p-4 flex flex-col justify-between h-full">
        <div>
          <h1 className="text-2xl font-bold text-black-500 mb-6">Contacts</h1>
          <FriendSearch />
        </div>

        {groups.length > 0 && (
          <div className="mt-8 w-full max-w-md">
            <h2 className="text-xl text-black-500 font-bold mb-4">
              My Groups:
            </h2>
            <ul className="space-y-4">
              {groups.map((group) => (
                <li
                  key={group.id}
                  className="bg-blue-500 hover:bg-blue-400  p-4 rounded-md  transition-colors"
                >
                  <strong>Group Name:</strong> {group.groupName} <br />
                  <a
                    href={group.githubRepo}
                    className="text-blue-200 underline hover:text-blue-300"
                  >
                    GitHub Repo: {group.githubRepo}
                  </a>
                  <a
                    href={`group/${group.id}`}
                    className="block mt-2 text-blue-200 underline hover:text-blue-300"
                  >
                    Group ID: {group.id}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Bottom section: Email and Phone */}
        <div className="border-t border-blue-200 text-black-500 mt-6 pt-4 text-center">
          <p className="text-sm">
            <strong>Email:</strong> {session?.user?.email || "User"}
          </p>
          <p className="text-sm">
            <strong>Phone:</strong> {session?.user?.phone || "No phone number"}
          </p>
        </div>
      </div>

      {/* Right side: Chat Area */}
      <div
        className={`${
          selectedChat ? "block" : "hidden md:block"
        } w-full md:w-3/4 bg-blue-100 p-6 flex flex-col justify-between h-full`}
      >
        {/* Chat content can go here */}
      </div>
    </div>
  ) : (
    <p className="text-center text-blue-600">Please Sign In to see chats</p>
  );
};

export default ChatApp;
