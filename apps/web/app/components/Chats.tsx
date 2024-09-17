"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import FriendSearch from "../components/FriendSearch";

// Example contact list with phone numbers
const contacts = [
  { id: "1", name: "Contact 1", phone: "123-456-7890" },
  { id: "2", name: "Contact 2", phone: "234-567-8901" },
  { id: "3", name: "Contact 3", phone: "345-678-9012" },
];

const ChatApp = () => {
  const { data: session } = useSession();
  const [selectedChat, setSelectedChat] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const router = useRouter();

  // Filter contacts based on search term
  const filteredContacts = contacts.filter(
    (contact) =>
      contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.phone.includes(searchTerm)
  );

  return (
    <div className="flex h-screen bg-[#f5c6e0]">
      {/* top section  */}
      <div className="border-b-2 border-[#d1a1d0] p-4 bg-[#d1a1d0] text-white">
        <h2 className="text-xl font-semibold">
          {session?.user?.email || "User"} -{" "}
          {session?.user?.phone || "No phone number"}
        </h2>
      </div>

      {/* Left side: Contact List */}
      <div className="w-full md:w-1/4 bg-[#e0a1d0] text-white p-4 flex flex-col space-y-4">
        <h1 className="text-xl font-bold text-[#d1a1d0] mb-4">Contacts</h1>
        <FriendSearch />
      </div>

      {/* Right side: Chat Area */}
      <div
        className={`${
          selectedChat ? "block" : "hidden md:block"
        } w-full md:w-3/4 bg-[#e5b6e5] p-6 flex flex-col justify-between`}
      ></div>
    </div>
  );
};

export default ChatApp;
