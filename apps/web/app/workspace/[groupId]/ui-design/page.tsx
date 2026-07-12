import UiDesign from "./UiDesign";
import React from "react";

export default function UiDesignPage({ params }: { params: { groupId: string } }) {
  const { groupId } = params;

  return <UiDesign groupId={groupId} />;
}
