"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import FriendSearch from "../components/FriendSearch";

// Example contact list with phone numbers
const contacts = [
  { id: "1", name: "Contact 1", phone: "123-456-7890" },
  { id: "2", name: "Contact 2", phone: "234-567-8901" },
  { id: "3", name: "Contact 3", phone: "345-678-9012" },
];

const ChatApp = () => {
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
      >
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="border-b-2 border-[#d1a1d0] p-4 bg-[#d1a1d0] text-white">
              <h2 className="text-xl font-semibold">
                Chat with {contacts.find((c) => c.id === selectedChat)?.name}
              </h2>
            </div>

            {/* Chat Messages */}
            <div className="flex-grow p-6 space-y-4 overflow-y-auto">
              <div className="bg-[#f5c6e0] text-white p-4 rounded-lg w-3/4 self-end">
                Hello! How are you?
              </div>
              <div className="bg-white text-black p-4 rounded-lg w-3/4 self-start">
                I'm good, thanks! How about you?
              </div>
            </div>

            {/* Chat Input */}
            <div className="p-4 border-t-2 border-[#d1a1d0] bg-white flex space-x-4">
              <input
                type="text"
                placeholder="Type a message"
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f5c6e0]"
              />
              <button className="bg-[#f5c6e0] text-white px-4 py-3 rounded-lg hover:bg-[#d1a1d0]">
                Send
              </button>
            </div>
          </>
        ) : (
          <div className="hidden md:block text-center text-white">
            <p>Select a contact to start chatting.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatApp;
