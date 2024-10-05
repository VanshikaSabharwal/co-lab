"use client";
import React, { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { FaUsers, FaPaperPlane } from "react-icons/fa";
import toast from "react-hot-toast";
import Link from "next/link";

interface GroupChatProps {
  group: string;
}

interface Message {
  id: string;
  senderId: string | undefined;
  senderName: string | undefined;
  groupId: string;
  content: string;
  createdAt: number;
}

interface GroupDetails {
  id: string;
  ownerId: string;
  githubRepo: string;
  groupName: string;
}

const GroupChat: React.FC<GroupChatProps> = ({ group }) => {
  const { data: session, status } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const wsRef = useRef<WebSocket | null>(null);
  const [groupDetails, setGroupDetails] = useState<GroupDetails | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [loadingGroupDetails, setLoadingGroupDetails] = useState(true);
  const [loadingPercentage, setLoadingPercentage] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const githubRepo = groupDetails?.githubRepo;
  const groupName = groupDetails?.groupName;

  const senderId = session?.user?.id;
  const senderName = session?.user?.name;
  const isOwner = session?.user.id === groupDetails?.ownerId;

  const fetchMessages = async () => {
    if (group) {
      try {
        const res = await fetch(`/api/save-group-message?group=${group}`, {
          method: "GET",
        });
        const data: Message[] = await res.json();
        setMessages(data);
      } catch (err) {
        console.error("Error fetching messages: ", err);
        toast.error("Failed to fetch messages");
      }
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      const fetchGroupDetails = async () => {
        try {
          const response = await fetch(`/api/create-group-data?group=${group}`);
          const data = await response.json();
          setGroupDetails(data);
        } catch (err) {
          console.error("Error fetching details: ", err);
          toast.error("Failed to fetch group details");
        } finally {
          setLoadingGroupDetails(false);
        }
      };

      fetchMessages();
      fetchGroupDetails();

      // Simulate loading percentage
      let interval = setInterval(() => {
        setLoadingPercentage((prev) => {
          if (prev < 100) return prev + 1;
          clearInterval(interval);
          return prev;
        });
      }, 10);
      return () => clearInterval(interval);
    }
  }, [group, status]);

  useEffect(() => {
    if (session && groupDetails) {
      const fetchMembers = async () => {
        try {
          const res = await fetch(
            `/api/check-group-member?group=${group}&userId=${senderId}`
          );
          const data = await res.json();
          setIsMember(data.exists);
        } catch (err) {
          console.log("Error: ", err);
          toast.error("Failed to check group membership");
        }
      };

      fetchMembers();

      // Establish WebSocket connection
      if (!wsRef.current) {
        wsRef.current = new WebSocket(
          `https://code-co-lab-crew.onrender.com?userId=${senderId}&groupId=${group}`
        );

        // Handle incoming WebSocket messages
        wsRef.current.onmessage = (event) => {
          const message = JSON.parse(event.data);
          setMessages((prevMessages) => [
            ...prevMessages,
            {
              id: message.id,
              senderId: message.senderId,
              senderName: message.senderName,
              groupId: message.groupId,
              content: message.content,
              createdAt: message.createdAt,
            },
          ]);
        };

        // Handle WebSocket connection closure
        wsRef.current.onclose = () => {
          console.log("WebSocket closed, attempting to reconnect...");
          wsRef.current = null;
        };
      }

      return () => {
        wsRef.current?.close();
        wsRef.current = null; // Cleanup WebSocket connection
      };
    }
  }, [session, groupDetails, group, senderId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    const isOwner = session?.user.id === groupDetails?.ownerId;

    if (newMessage.trim() && wsRef.current && (isMember || isOwner)) {
      const generateId = () => `${Date.now()}-${Math.random()}`;
      const message = {
        id: generateId(),
        content: newMessage,
        groupId: group,
        senderId,
        senderName,
        createdAt: Date.now(),
      };
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(message));
        setNewMessage("");
      }

      try {
        const response = await fetch("/api/save-group-message", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(message),
        });

        if (!response.ok) {
          throw new Error("Failed to save message");
        }

        await response.json();
      } catch (error) {
        console.error("Failed to save message:", error);
        toast.error("Failed to send message");
      }
    } else {
      toast.error("You cannot send messages.");
    }
  };

  if (loadingGroupDetails) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
          <div className="mt-4 text-xl">{loadingPercentage}%</div>
        </div>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
          <div className="mt-4 text-xl">{loadingPercentage}%</div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex justify-center items-center h-screen text-2xl font-bold text-red-500">
        You are not logged in
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen  bg-gray-100">
      <div className="flex-1 overflow-hidden">
        <div className="max-w-3xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden flex flex-col h-full">
          <div className="bg-blue-500 text-white p-4">
            <h1 className="text-2xl font-bold text-center">
              {groupDetails?.groupName}
            </h1>
            <h2 className="text-sm text-center mt-1">Group ID: {group}</h2>
            <Link href={`/code-editor/${group}/${groupName}`}>Code Editor</Link>
          </div>
          <div
            className="flex-1 overflow-y-auto p-4"
            style={{ maxHeight: "calc(100vh - 240px)" }}
          >
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex mb-4 ${
                  msg.senderId === session?.user?.id
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                <div
                  className={`max-w-xs lg:max-w-md xl:max-w-lg break-words p-3 rounded-lg ${
                    msg.senderId === session?.user?.id
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 text-black"
                  }`}
                >
                  <p className="font-bold mb-1">{msg.senderName}</p>
                  <p>{msg.content}</p>
                  <p className="text-xs mt-1 opacity-75">
                    {new Date(msg.createdAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="bg-gray-100 p-4">
            <div className="flex items-center">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 border border-gray-300 rounded-l-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              />
              <button
                onClick={handleSendMessage}
                className={`bg-blue-500 text-white p-2 rounded-r-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  !isMember && session?.user.id !== groupDetails?.ownerId
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
                disabled={
                  !isMember && session?.user.id !== groupDetails?.ownerId
                }
              >
                <FaPaperPlane />
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="bg-white shadow-lg rounded-lg mt-4 p-8 max-w-3xl mx-auto">
        <div className="flex justify-between items-center gap-2">
          {isOwner && (
            <a
              href={`/addGroupMember/${group}`}
              className="bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600 transition duration-300"
            >
              Add Member
            </a>
          )}
          <a
            href={`/viewMembers/${group}`}
            className="flex items-center text-blue-600 hover:text-blue-800 transition duration-300"
          >
            <FaUsers className="mr-2" />
            View Members
          </a>
          <a
            href={groupDetails?.githubRepo}
            className="bg-gray-800 text-white py-2 px-4 rounded hover:bg-gray-700 transition duration-300"
          >
            GitHub Repo
          </a>
        </div>
      </div>
    </div>
  );
};

export default GroupChat;
