import MindMap from "./MindMap";
import React from "react";

export default function MindMapPage({ params }: { params: { groupId: string } }) {
  const { groupId } = params;

  return <MindMap groupId={groupId} />;
}
