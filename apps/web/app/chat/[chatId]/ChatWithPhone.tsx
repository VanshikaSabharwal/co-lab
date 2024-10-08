"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

interface ChatWithPhoneProps {
  phone: string;
}

interface Message {
  chatId: string;
  senderId: string;
  content: string;
  recipientId: string;
  timestamp: number;
}

const ChatWithPhone: React.FC<ChatWithPhoneProps> = ({ phone }) => {
  const { data: session, status } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const wsRef = useRef<WebSocket | null>(null);
  const chatId = [session?.user?.phone, phone].sort().join("-");
  const userId = session?.user.phone;

  // Load messages from localStorage
  useEffect(() => {
    const savedMessages = localStorage.getItem(chatId);
    if (savedMessages) {
      setMessages(JSON.parse(savedMessages));
    }
  }, [chatId]);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(chatId, JSON.stringify(messages));
    }
  }, [messages, chatId]);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.phone) {
      const connectWebSocket = () => {
        const ws = new WebSocket(
          `https://code-co-lab-crew.onrender.com?userId=${userId}`
        );
        wsRef.current = ws;

        ws.onmessage = async (event) => {
          try {
            const message = await JSON.parse(event.data);
            if (!message.timestamp) {
              message.timestamp = Date.now();
            }

            if (message.chatId === chatId) {
              setMessages((prevMessages) => [...prevMessages, message]);
            }
          } catch (err) {
            console.error("Error parsing message: ", err);
          }
        };

        ws.onerror = (err) => {
          console.error("WebSocket error: ", err);
        };

        ws.onclose = () => {
          console.warn("WebSocket closed, attempting to reconnect...");
          setTimeout(connectWebSocket, 3000);
        };
      };

      connectWebSocket();

      return () => {
        if (wsRef.current) {
          wsRef.current.close();
        }
      };
    }
  }, [status, session?.user?.phone]);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;

    const messageToSend: Message = {
      chatId,
      senderId: session?.user?.phone || "unknown",
      content: newMessage,
      recipientId: phone,
      timestamp: Date.now(),
    };

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(messageToSend));
      setMessages((prevMessages) => [...prevMessages, messageToSend]);
      setNewMessage("");
    }
  };

  // Handle chat deletion
  const handleDeleteChat = () => {
    localStorage.removeItem(chatId);
    setMessages([]);
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="p-4 bg-gray-200 flex justify-between items-center">
        <h2 className="text-xl text-black-900">Chat with {phone}</h2>
        <button
          onClick={handleDeleteChat}
          className="ml-2 p-2 bg-red-500 text-white rounded-lg"
        >
          Delete Chat
        </button>
      </div>

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
