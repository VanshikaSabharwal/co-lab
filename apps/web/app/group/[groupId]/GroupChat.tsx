"use client";
import React, { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { FaUsers } from "react-icons/fa";

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
}

const GroupChat: React.FC<GroupChatProps> = ({ group }) => {
  const { data: session, status } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const wsRef = useRef<WebSocket | null>(null);
  const [groupDetails, setGroupDetails] = useState<GroupDetails | null>(null);
  const [isMember, setIsMember] = useState(false);
  const [loadingGroupDetails, setLoadingGroupDetails] = useState(true);

  const senderId = session?.user?.id;
  const senderName = session?.user.name;

  useEffect(() => {
    if (status === "authenticated") {
      const fetchGroupDetails = async () => {
        try {
          const response = await fetch(`/api/create-group-data?group=${group}`);
          const data = await response.json();
          setGroupDetails(data);
        } catch (err) {
          console.error("Error fetching details: ", err);
        } finally {
          setLoadingGroupDetails(false);
        }
      };

      fetchGroupDetails();
    }
  }, [group, status]);

  useEffect(() => {
    if (session && groupDetails) {
      const fetchMembers = async () => {
        try {
          const res = await fetch(
            `/api/check-group-member?group=${group}&userId=${senderId}`,
            {
              method: "GET",
            }
          );
          const data = await res.json();
          setIsMember(data.exists);
        } catch (err) {
          console.log("Error: ", err);
        }
      };

      fetchMembers();
      wsRef.current = new WebSocket(`ws://localhost:8080/${group}`);

      wsRef.current.onmessage = (event) => {
        const message = JSON.parse(event.data);
        setMessages((prevMessages) => [...prevMessages, message]);
      };

      return () => {
        wsRef.current?.close();
      };
    }
  }, [session, groupDetails, group, senderId]);

  const handleSendMessage = async () => {
    if (
      newMessage.trim() &&
      wsRef.current &&
      (isMember || session?.user.id === groupDetails?.ownerId)
    ) {
      const message = {
        id: Date.now().toString(),
        senderId,
        senderName,
        groupId: group,
        content: newMessage,
        createdAt: Date.now(),
      };

      wsRef.current.send(JSON.stringify(message));

      setMessages((prevMessages) => [...prevMessages, message]);
      setNewMessage("");
    } else {
      alert("You cannot send messages.");
    }
  };

  if (loadingGroupDetails) {
    return <div>Loading group details...</div>; // Show loading for group details
  }

  if (status === "loading") {
    return <div>Loading session...</div>; // Loading state
  }

  if (!session) {
    return <div>You are not logged in</div>; // Not logged in
  }

  const isOwner = session?.user.id === groupDetails?.ownerId;
  console.log("Received Messages: ", messages);
  const renderMessages = () => {
    return messages.map((msg) => (
      <div key={msg.id} className="message mb-2">
        <strong>{msg.senderName}: </strong>
        <span>{msg.content}</span>
      </div>
    ));
  };

  return (
    <div className="chat-container p-6 max-w-lg mx-auto border border-gray-300 rounded-lg bg-white shadow-md">
      <h1 className="text-2xl font-bold text-center mb-4">Group Chat</h1>
      <h2>Group Id: {group}</h2>
      {isOwner && (
        <div className="flex justify-between mb-4">
          <a
            href={`/addGroupMember/${group}`}
            className="bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600"
          >
            Add Member
          </a>
        </div>
      )}
      <a
        href={`/viewMembers/${group}`}
        className="flex items-center text-blue-600 hover:text-blue-800"
      >
        <FaUsers className="mr-2" />
        View Members
      </a>
      <div className="messages-container max-h-[600px] overflow-y-auto border border-gray-300 rounded p-2 mb-4 bg-gray-50">
        {renderMessages()}
      </div>
      <input
        type="text"
        value={newMessage}
        onChange={(e) => setNewMessage(e.target.value)}
        placeholder="Type a message..."
        className="border border-gray-300 rounded p-2 w-full mb-2"
      />
      <button
        onClick={handleSendMessage}
        className={`bg-blue-500 text-white py-2 rounded w-full hover:bg-blue-600 ${!isMember && session?.user.id !== groupDetails?.ownerId ? "opacity-50 cursor-not-allowed" : ""}`}
        disabled={!isMember && session?.user.id !== groupDetails?.ownerId}
      >
        Send
      </button>
    </div>
  );
};

export default GroupChat;
