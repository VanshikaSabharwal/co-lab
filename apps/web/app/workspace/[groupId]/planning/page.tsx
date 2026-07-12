import Planning from "./Planning";
import React from "react";

export default function PlanningPage({ params }: { params: { groupId: string } }) {
  const { groupId } = params;

  return <Planning groupId={groupId} />;
}
