"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import db from "@repo/db/client";

interface ChatWithPhoneProps {
  phone: string;
}

const ChatWithPhone: React.FC<ChatWithPhoneProps> = ({ phone }) => {
  const { data: session } = useSession(); // Get session data
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const wsRef = useRef<WebSocket | null>(null);
  const chatId = phone;

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await fetch(`/api/messages?chatId=${chatId}`, {
          method: "POST",
          headers: {
            "Content-type": "application/json",
          },
          body: JSON.stringify({ chatId }),
        });

        const data = await response.json();

        setMessages(data);
      } catch (err) {
        console.error("Error fetching messages: ", err);
      }
    };

    fetchMessages();

    const ws = new WebSocket("ws://localhost:8080");
    wsRef.current = ws;

    // Handle incoming messages
    ws.onmessage = async (event) => {
      try {
        const message = await event.data.text(); // Read Blob as text
        const parsedMessage = JSON.parse(message);
        setMessages((prevMessages) => [...prevMessages, parsedMessage]);
      } catch (err) {
        console.error("Error parsing message: ", err);
      }
    };

    // Clean up WebSocket connection on unmount
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    const messageToSend = {
      phone,
      content: newMessage,
      senderId: session?.user?.phone || "unknown",
      chatId,
    };

    // Send message through WebSocket
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify(messageToSend));
      setNewMessage(""); // Clear input
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="p-4 bg-gray-200">
        <h2 className="text-xl text-black-900">Chat with {phone}</h2>
      </div>

      {/* Chat messages */}
      <div className="flex-grow p-6 overflow-y-auto">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex mb-4 ${
              msg.senderId === session?.user?.phone
                ? "justify-end"
                : "justify-start"
            }`}
          >
            <span
              className={`inline-block max-w-xs break-words p-2 rounded-lg ${
                msg.senderId === session?.user?.phone
                  ? "bg-blue-500 text-white"
                  : "bg-gray-300 text-black"
              }`}
            >
              {msg.content}
            </span>
          </div>
        ))}
      </div>

      {/* Input box */}
      <div className="p-4 border-t flex">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message"
          className="flex-grow p-3 border rounded-lg"
        />
        <button
          onClick={handleSendMessage}
          className="ml-2 p-3 bg-blue-500 text-white rounded-lg"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatWithPhone;
