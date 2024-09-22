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

  return session ? (
    <div className="flex h-screen bg-[#f5c6e0]">
      {/* Left side: Contact List */}
      <div className="w-full md:w-1/4 bg-[#e0a1d0] text-white p-4 flex flex-col justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-6">Contacts</h1>
          <FriendSearch />
          <div className="mt-4 space-y-4">
            {filteredContacts.map((contact) => (
              <div
                key={contact.id}
                className="bg-[#d1a1d0] p-3 rounded-md hover:bg-[#c590c9] transition-colors"
              >
                <h2 className="text-lg font-semibold">{contact.name}</h2>
                <p className="text-sm">{contact.phone}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom section: Email and Phone */}
        <div className="border-t border-white mt-6 pt-4 text-center">
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
        } w-full md:w-3/4 bg-[#e5b6e5] p-6 flex flex-col justify-between`}
      >
        {/* Chat content can go here */}
      </div>
    </div>
  ) : (
    <p>Please Sign In to see chats</p>
  );
};

export default ChatApp;
