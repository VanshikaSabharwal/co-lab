"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Cookies from "js-cookie";

interface ChatWithPhoneProps {
  phone: string;
}

interface GuestData {
  guestId: string;
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
  console.log(session);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  // const chatId = [session?.user?.phone, phone].sort().join("-");
  const [chatId, setChatId] = useState("");
  const [userId, setUserId] = useState("");
  console.log(userId);
  const router = useRouter();
  const [guestData, setGuestData] = useState<GuestData | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserPhone = async () => {
      if (session?.user?.email) {
        try {
          const res = await fetch(
            `/api/get-user-number?email=${session.user.email}`,
          );
          const data = await res.json();
          if (res.ok) {
            setUserId(data.phone || "");
            setChatId([data.phone, phone].sort().join("-"));
          } else {
            console.error("Failed to fetch phone:", data.error);
          }
        } catch (err) {
          console.error("Error fetching phone:", err);
        }
      }
    };

    if (status === "authenticated") {
      fetchUserPhone();
    }
  }, [status, session?.user?.email, phone]);

  // Get WebSocket URL based on environment
  const getWebSocketUrl = () => {
    if (!userId) return "";

    // For development: connect directly to WebSocket server on port 8080
    if (process.env.NODE_ENV === "development") {
      return `ws://localhost:8080/ws?userId=${userId}`;
    } else if (process.env.NODE_ENV === "production") {
      return `wss://ko-lab.onrender.com/ws?userId=${userId}`;
    }

    // For production: use the same host but different path
    return `wss://ko-lab.onrender.com/ws?userId=${userId}`;
  };

  useEffect(() => {
    const guestId = Cookies.get("guestId");
    if (guestId) {
      setGuestData({ guestId });
    }
  }, []);

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
    if (!userId) return;
    const connectWebSocket = () => {
      try {
        const wsUrl = getWebSocketUrl();
        console.log("🔗 Connecting to WebSocket:", wsUrl);

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log("✅ WebSocket connected successfully");
          setIsConnected(true);
        };

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
          setIsConnected(false);
        };

        ws.onclose = () => {
          console.warn("WebSocket closed, attempting to reconnect...");
          setIsConnected(false);
          setTimeout(connectWebSocket, 3000);
        };
      } catch (error) {
        console.error("Failed to create WebSocket connection:", error);
        setIsConnected(false);
      }
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setIsConnected(false);
    };
  }, [userId]);

  const handleSendMessage = () => {
    console.log("🟡 Send button clicked");
    console.log("🟡 New message content:", newMessage);

    if (!newMessage.trim()) {
      console.log("⚠️ Message is empty, not sending");
      return;
    }

    if (guestData && !session) {
      console.warn("⚠️ Guest user cannot send messages");
      toast.error("Please Sign Up/Login to send messages");
      return;
    }

    // Check WebSocket connection
    if (!wsRef.current) {
      console.error("❌ WebSocket reference is null");
      toast.error("Connection not established. Please refresh the page.");
      return;
    }

    if (wsRef.current.readyState !== WebSocket.OPEN) {
      console.error("❌ WebSocket not open. State:", wsRef.current.readyState);
      toast.error("Connection lost. Trying to reconnect...");

      // Store message temporarily and try to reconnect
      const messageToSend: Message = {
        chatId,
        senderId: userId || "unknown",
        content: newMessage,
        recipientId: phone,
        timestamp: Date.now(),
      };

      // Save to localStorage for retry
      const pendingMessages = JSON.parse(
        localStorage.getItem("pendingMessages") || "[]",
      );
      pendingMessages.push(messageToSend);
      localStorage.setItem("pendingMessages", JSON.stringify(pendingMessages));

      setNewMessage("");
      toast.success("Message saved. Will send when reconnected.");
      return;
    }

    const messageToSend: Message = {
      chatId,
      senderId: userId,
      recipientId: phone,
      content: newMessage,
      timestamp: Date.now(),
    };

    try {
      wsRef.current.send(JSON.stringify(messageToSend));
      console.log("✅ Message sent via WebSocket:", messageToSend);
      setMessages((prevMessages) => [...prevMessages, messageToSend]);
      setNewMessage("");
    } catch (error) {
      console.error("❌ Error sending message:", error);
      toast.error("Failed to send message");
    }
  };

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleDeleteChat = () => {
    localStorage.removeItem(chatId);
    setMessages([]);
    toast.success("Chat deleted successfully");
  };

  const handleViewMessage = () => {
    router.push(`/chat/${chatId}`);
    setNotification(null);
  };

  return (
    <div className="flex flex-col h-screen">
      <div className="p-4 bg-gray-200 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl text-black-900">Chat with {phone}</h2>
          <div
            className={`flex items-center space-x-2 ${isConnected ? "text-green-600" : "text-red-600"}`}
          >
            <div
              className={`w-3 h-3 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}
            ></div>
            <span className="text-sm">
              {isConnected ? "Connected" : "Disconnected"}
            </span>
          </div>
        </div>
        <button
          onClick={handleDeleteChat}
          className="ml-2 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
        >
          Delete Chat
        </button>
      </div>

      {notification && (
        <div
          className="fixed bottom-4 left-4 p-4 bg-yellow-500 text-white rounded-lg cursor-pointer hover:bg-yellow-600 transition-colors"
          onClick={handleViewMessage}
        >
          {notification}
        </div>
      )}

      <div className="flex-grow p-6 overflow-y-auto bg-gray-50">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            No messages yet. Start a conversation!
          </div>
        ) : (
          messages.map((msg, index) => (
            <div
              key={index}
              className={`flex mb-4 ${
                msg.senderId === userId ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-xs break-words p-3 rounded-lg ${
                  msg.senderId === userId
                    ? "bg-blue-500 text-white"
                    : "bg-gray-300 text-black"
                }`}
              >
                <div className="text-sm opacity-75 mb-1">
                  {msg.senderId === userId ? "You" : msg.senderId}
                </div>
                <div>{msg.content}</div>
                <div className="text-xs opacity-75 mt-1">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-4 border-t bg-white flex">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={isConnected ? "Type a message..." : "Connecting..."}
          disabled={!isConnected}
          className="flex-grow p-3 border rounded-lg focus:outline-none focus:border-blue-500 disabled:bg-gray-100"
        />
        <button
          onClick={handleSendMessage}
          disabled={!isConnected || !newMessage.trim()}
          className="ml-2 p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatWithPhone;
