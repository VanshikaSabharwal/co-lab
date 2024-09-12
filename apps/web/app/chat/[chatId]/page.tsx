"use client";
import { useParams } from "next/navigation";

const ChatPage = () => {
  const { chatId } = useParams(); // useParams to get the dynamic route parameter

  return (
    <div>
      <h1>Chat with User {chatId}</h1>
      {/* Display chat messages based on chatId */}
    </div>
  );
};

export default ChatPage;
