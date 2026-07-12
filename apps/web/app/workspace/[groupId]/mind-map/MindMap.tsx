"use client";

import React, { useMemo } from "react";
import { useSession } from "next-auth/react";
import { Plus } from "lucide-react";
import { v4 as uuid } from "uuid";
import type { NodeTypes } from "@xyflow/react";
import { useWorkspaceBoard } from "../../lib/useWorkspaceBoard";
import WorkspaceCanvas from "../../components/WorkspaceCanvas";
import StickyNoteNode, { type StickyColor } from "./StickyNoteNode";

interface MindMapProps {
  groupId: string;
}

const NODE_TYPES: NodeTypes = { sticky: StickyNoteNode };

export default function MindMap({ groupId }: MindMapProps) {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  const {
    nodes,
    edges,
    presence,
    isConnected,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    updateNodeData,
  } = useWorkspaceBoard({ groupId, type: "MIND_MAP", slug: "mind-map", userId });

  const displayNodes = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        data: {
          ...n.data,
          onChange: (value: string) => updateNodeData(n.id, { label: value }),
          onColorChange: (color: StickyColor) => updateNodeData(n.id, { color }),
        },
      })),
    [nodes, updateNodeData],
  );

  const handleAddNote = () => {
    addNode({
      id: uuid(),
      type: "sticky",
      position: { x: 100 + Math.random() * 200, y: 100 + Math.random() * 200 },
      data: { label: "", color: "yellow" },
    });
  };

  return (
    <WorkspaceCanvas
      groupId={groupId}
      title="Mind Map"
      nodes={displayNodes}
      edges={edges}
      nodeTypes={NODE_TYPES}
      presence={presence}
      currentUserId={userId}
      isConnected={isConnected}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      toolbar={
        <button
          onClick={handleAddNote}
          className="flex items-center gap-1.5 rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
        >
          <Plus size={14} />
          Add note
        </button>
      }
    />
  );
}
