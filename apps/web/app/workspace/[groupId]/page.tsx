import WorkspaceHub from "./WorkspaceHub";
import React from "react";

export default function WorkspacePage({ params }: { params: { groupId: string } }) {
  const { groupId } = params;

  return <WorkspaceHub groupId={groupId} />;
}
