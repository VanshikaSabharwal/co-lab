import React from "react";
import Confirm from "./Confirm";

export default function ConfirmChanges({
  params,
}: {
  params: { groupId: string };
}) {
  const { groupId } = params;

  return <Confirm group={groupId} />;
}
