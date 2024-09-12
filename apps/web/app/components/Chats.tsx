"use client";

import React from "react";

const ChatApp = () => {
  return (
    <div className="flex h-screen bg-[#f5c6e0]">
      {/* Left side: Contact List */}
      <div className="w-1/4 bg-[#333] text-white p-4 flex flex-col space-y-4">
        <h1 className="text-xl font-bold text-[#d1a1d0] mb-4">Contacts</h1>

        {/* Contact Items */}
        <div className="space-y-2">
          <div className="p-3 bg-[#d1a1d0] rounded cursor-pointer hover:bg-[#e5b6e5] hover:text-black">
            <p>Contact 1</p>
          </div>
          <div className="p-3 bg-[#d1a1d0] rounded cursor-pointer hover:bg-[#e5b6e5] hover:text-black">
            <p>Contact 2</p>
          </div>
          <div className="p-3 bg-[#d1a1d0] rounded cursor-pointer hover:bg-[#e5b6e5] hover:text-black">
            <p>Contact 3</p>
          </div>
        </div>
      </div>

      {/* Right side: Chat Area */}
      <div className="w-3/4 bg-[#e5b6e5] p-6 flex flex-col justify-between">
        {/* Chat Header */}
        <div className="border-b-2 border-[#d1a1d0] p-4 bg-[#d1a1d0] text-white">
          <h2 className="text-xl font-semibold">Chat with Contact 1</h2>
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
      </div>
    </div>
  );
};

export default ChatApp;
