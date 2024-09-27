import ViewGroupMembers from "./ViewMembers";
import React from "react";

export default function ChatPage({ params }: { params: { groupId: string } }) {
  const { groupId } = params;

  return <ViewGroupMembers groupId={groupId} />;
}
