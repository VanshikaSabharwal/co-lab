"use client";
import React, { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

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
const GroupChat: React.FC<GroupChatProps> = ({ group }) => {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const wsRef = useRef<WebSocket | null>(null);
  const senderId = session?.user?.id;
  const [groupDetails, setGroupDetails] = useState<GroupDetails | null>(null);
  console.log(group);
  console.log(groupDetails);

  useEffect(() => {
    const fetchGroupDetails = async () => {
      try {
        const response = await fetch(`/api/create-group-data?group=${group}`);
        const data = await response.json();
        setGroupDetails(data);
      } catch (err) {
        console.error("Error fetching details: ", err);
      }
    };
    fetchGroupDetails();
  }, [group]);
  useEffect(() => {
    if (session) {
      // Connect to WebSocket
      wsRef.current = new WebSocket(`ws://http://localhost:8080/${group}`);

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
    if (newMessage.trim() && wsRef.current) {
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
      <div key={msg.id} style={{ marginBottom: "10px" }}>
        <strong>{msg.senderId}: </strong>
        <span>{msg.content}</span>
      </div>
    ));
  };

  return (
    <div
      style={{
        padding: "20px",
        maxWidth: "600px",
        margin: "auto",
        border: "1px solid #ccc",
        borderRadius: "8px",
        backgroundColor: "#f9f9f9",
      }}
    >
      <h1 style={{ textAlign: "center" }}>Group Chat</h1>
      {isOwner && (
        <a
          href={`/addGroupMember/${group}`}
          style={{
            display: "block",
            margin: "10px auto",
            padding: "10px 20px",
            border: "none",
            borderRadius: "4px",
            backgroundColor: "#28a745",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          Add Member
        </a>
      )}
      <div
        style={{
          maxHeight: "400px",
          overflowY: "auto",
          border: "1px solid #ccc",
          borderRadius: "4px",
          padding: "10px",
          backgroundColor: "#fff",
        }}
      >
        {renderMessages()}
      </div>
      <input
        type="text"
        value={newMessage}
        onChange={(e) => setNewMessage(e.target.value)}
        placeholder="Type a message..."
        style={{
          width: "calc(100% - 22px)",
          padding: "10px",
          marginTop: "10px",
          border: "1px solid #ccc",
          borderRadius: "4px",
        }}
      />
      <button
        onClick={handleSendMessage}
        style={{
          width: "100%",
          padding: "10px",
          marginTop: "10px",
          border: "none",
          borderRadius: "4px",
          backgroundColor: "#007bff",
          color: "#fff",
          cursor: "pointer",
        }}
      >
        Send
      </button>
    </div>
  );
};

export default GroupChat;
