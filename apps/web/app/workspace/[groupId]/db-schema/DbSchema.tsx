"use client";

import React, { useMemo } from "react";
import { useSession } from "next-auth/react";
import { Plus } from "lucide-react";
import { v4 as uuid } from "uuid";
import type { EdgeTypes, NodeTypes } from "@xyflow/react";
import { useWorkspaceBoard } from "../../lib/useWorkspaceBoard";
import WorkspaceCanvas from "../../components/WorkspaceCanvas";
import TableNode, { type ColumnDef } from "./TableNode";
import RelationEdge from "./RelationEdge";

interface DbSchemaProps {
  groupId: string;
}

const NODE_TYPES: NodeTypes = { table: TableNode };
const EDGE_TYPES: EdgeTypes = { relation: RelationEdge };
const CARDINALITIES = ["1-1", "1-many", "many-many"];

export default function DbSchema({ groupId }: DbSchemaProps) {
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
    updateEdgeLabel,
  } = useWorkspaceBoard({ groupId, type: "DB_SCHEMA", slug: "db-schema", userId });

  const displayNodes = useMemo(
    () =>
      nodes.map((n) => {
        const columns = (n.data?.columns as ColumnDef[]) ?? [];
        return {
          ...n,
          data: {
            ...n.data,
            onRenameTable: (tableName: string) => updateNodeData(n.id, { tableName }),
            onAddColumn: () =>
              updateNodeData(n.id, {
                columns: [...columns, { id: uuid(), name: "column", type: "string" }],
              }),
            onUpdateColumn: (columnId: string, patch: Partial<ColumnDef>) =>
              updateNodeData(n.id, {
                columns: columns.map((c) => (c.id === columnId ? { ...c, ...patch } : c)),
              }),
            onRemoveColumn: (columnId: string) =>
              updateNodeData(n.id, { columns: columns.filter((c) => c.id !== columnId) }),
          },
        };
      }),
    [nodes, updateNodeData],
  );

  const displayEdges = useMemo(
    () =>
      edges.map((e) => ({
        ...e,
        type: "relation",
        data: {
          onCycleLabel: (edgeId: string) => {
            const current = edges.find((edge) => edge.id === edgeId);
            const idx = CARDINALITIES.indexOf((current?.label as string) || "1-1");
            updateEdgeLabel(edgeId, CARDINALITIES[(idx + 1) % CARDINALITIES.length]!);
          },
        },
      })),
    [edges, updateEdgeLabel],
  );

  const handleAddTable = () => {
    addNode({
      id: uuid(),
      type: "table",
      position: { x: 80 + Math.random() * 300, y: 80 + Math.random() * 200 },
      data: {
        tableName: "new_table",
        columns: [{ id: uuid(), name: "id", type: "string", isPrimaryKey: true }],
      },
    });
  };

  return (
    <WorkspaceCanvas
      groupId={groupId}
      title="DB Schema Design"
      nodes={displayNodes}
      edges={displayEdges}
      nodeTypes={NODE_TYPES}
      edgeTypes={EDGE_TYPES}
      presence={presence}
      currentUserId={userId}
      isConnected={isConnected}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      toolbar={
        <button
          onClick={handleAddTable}
          className="flex items-center gap-1.5 rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
        >
          <Plus size={14} />
          Add table
        </button>
      }
    />
  );
}
