import GroupChat from "./GroupChat";
import React from "react";

export default function ChatPage({ params }: { params: { groupId: string } }) {
  const { groupId } = params;

  return <GroupChat group={groupId} />;
}
