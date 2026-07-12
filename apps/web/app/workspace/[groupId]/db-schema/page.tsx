import DbSchema from "./DbSchema";
import React from "react";

export default function DbSchemaPage({ params }: { params: { groupId: string } }) {
  const { groupId } = params;

  return <DbSchema groupId={groupId} />;
}
