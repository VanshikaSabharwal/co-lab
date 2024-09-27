"use client";
import React, { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { FaUsers } from "react-icons/fa"; // Importing an icon from react-icons

interface GroupChatProps {
  group: string;
}

interface Message {
  id: string;
  senderId: string | undefined;
  groupId: string;
  content: string;
  createdAt: number;
}

interface GroupDetails {
  id: string;
  ownerId: string;
}

interface GroupMember {
  userId: string;
}

const GroupChat: React.FC<GroupChatProps> = ({ group }) => {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const wsRef = useRef<WebSocket | null>(null);
  const senderId = session?.user?.id;
  const [groupDetails, setGroupDetails] = useState<GroupDetails | null>(null);
  const [isMember, setIsMember] = useState(false);

  useEffect(() => {
    const fetchGroupDetails = async () => {
      try {
        const response = await fetch(`/api/create-group-data?group=${group}`);
        const data = await response.json();
        setGroupDetails(data);

        // Check if the user is a member of the group
        const memberResponse = await fetch(`/api/group-members?group=${group}`);
        const members: GroupMember[] = await memberResponse.json();
        setIsMember(members.some((member) => member.userId === senderId));
      } catch (err) {
        console.error("Error fetching details: ", err);
      }
    };
    fetchGroupDetails();
  }, [group, senderId]);

  useEffect(() => {
    if (session) {
      // Connect to WebSocket
      wsRef.current = new WebSocket(`ws://localhost:8080/${group}`);

      wsRef.current.onmessage = (event) => {
        const message = JSON.parse(event.data);
        setMessages((prevMessages) => [...prevMessages, message]);
      };

      return () => {
        wsRef.current?.close();
      };
    }
  }, [session, group]);

  const handleSendMessage = async () => {
    if (
      newMessage.trim() &&
      wsRef.current &&
      (isMember || session?.user.id === groupDetails?.ownerId)
    ) {
      const message = {
        id: group,
        senderId,
        groupId: group,
        content: newMessage,
        createdAt: Date.now(),
      };

      // Send message to WebSocket server
      wsRef.current.send(JSON.stringify(message));

      // Update state for instant UI feedback
      setMessages((prevMessages) => [...prevMessages, message]);
      setNewMessage("");
    }
  };

  const isOwner = session?.user.id === groupDetails?.ownerId;

  const renderMessages = () => {
    return messages.map((msg) => (
      <div key={msg.id} className="message">
        <strong>{msg.senderId}: </strong>
        <span>{msg.content}</span>
      </div>
    ));
  };

  return (
    <div className="chat-container p-6 max-w-lg mx-auto border border-gray-300 rounded-lg bg-white shadow-md">
      <h1 className="text-2xl font-bold text-center mb-4">Group Chat</h1>
      {isOwner && (
        <div className="flex justify-between mb-4">
          <a
            href={`/addGroupMember/${group}`}
            className="bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600"
          >
            Add Member
          </a>
          <a
            href={`/viewMembers/${group}`}
            className="flex items-center text-blue-600 hover:text-blue-800"
          >
            <FaUsers className="mr-2" />
            View Members
          </a>
        </div>
      )}
      <div className="messages-container max-h-[600px] overflow-y-auto border border-gray-300 rounded p-2 mb-4 bg-gray-50">
        {" "}
        {/* Increased size */}
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
