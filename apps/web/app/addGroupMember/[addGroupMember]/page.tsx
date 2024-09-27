import GroupMember from "./GroupMember";
import React from "react";

export default function ChatPage({
  params,
}: {
  params: { addGroupMember: string };
}) {
  const { addGroupMember } = params;

  return <GroupMember groupId={addGroupMember} />;
}
