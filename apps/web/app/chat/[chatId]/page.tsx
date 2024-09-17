import ChatWithPhone from "./ChatWithPhone";

// This function receives route parameters
export default function ChatPage({ params }: { params: { chatId: string } }) {
  const { chatId } = params;

  // Pass chatId as a string to the ChatWithPhone component
  return <ChatWithPhone phone={chatId} />;
}
