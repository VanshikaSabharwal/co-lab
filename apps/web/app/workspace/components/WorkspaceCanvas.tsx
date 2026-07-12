"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type EdgeTypes,
  type Node,
  type NodeChange,
  type NodeTypes,
  type OnSelectionChangeFunc,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import PresenceBar from "./PresenceBar";

interface WorkspaceCanvasProps {
  groupId: string;
  title: string;
  nodes: Node[];
  edges: Edge[];
  nodeTypes?: NodeTypes;
  edgeTypes?: EdgeTypes;
  presence: string[];
  currentUserId?: string;
  isConnected: boolean;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  toolbar?: React.ReactNode;
  sidebar?: React.ReactNode;
  /** Optional panel rendered to the right of the canvas (properties panel). */
  rightPanel?: React.ReactNode;
  /** Optional children rendered inside <ReactFlow> (cursor overlays etc.). */
  overlay?: React.ReactNode;
  snapToGrid?: boolean;
  snapGrid?: [number, number];
  onSelectionChange?: OnSelectionChangeFunc;
  // Called with the dropped item's drag payload and its position translated
  // into flow coordinates — used by the UI/UX design palette.
  onDropItem?: (payload: string, position: { x: number; y: number }) => void;
}

function CanvasArea({
  nodes,
  edges,
  nodeTypes,
  edgeTypes,
  onNodesChange,
  onEdgesChange,
  onConnect,
  toolbar,
  overlay,
  snapToGrid,
  snapGrid,
  onSelectionChange,
  onDropItem,
}: Pick<
  WorkspaceCanvasProps,
  | "nodes"
  | "edges"
  | "nodeTypes"
  | "edgeTypes"
  | "onNodesChange"
  | "onEdgesChange"
  | "onConnect"
  | "toolbar"
  | "overlay"
  | "snapToGrid"
  | "snapGrid"
  | "onSelectionChange"
  | "onDropItem"
>) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  return (
    <div
      ref={wrapperRef}
      className="relative flex-1"
      onDragOver={(e) => {
        if (!onDropItem) return;
        e.preventDefault();
      }}
      onDrop={(e) => {
        if (!onDropItem) return;
        e.preventDefault();
        const payload = e.dataTransfer.getData("application/x-workspace-item");
        if (!payload) return;
        const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
        onDropItem(payload, position);
      }}
    >
      {toolbar && <div className="absolute left-3 top-3 z-10">{toolbar}</div>}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onSelectionChange={onSelectionChange}
        snapToGrid={snapToGrid}
        snapGrid={snapGrid}
        colorMode="dark"
        fitView
      >
        <Background />
        <Controls />
        <MiniMap pannable zoomable />
        {overlay}
      </ReactFlow>
    </div>
  );
}

export default function WorkspaceCanvas({
  groupId,
  title,
  nodes,
  edges,
  nodeTypes,
  edgeTypes,
  presence,
  currentUserId,
  isConnected,
  onNodesChange,
  onEdgesChange,
  onConnect,
  toolbar,
  sidebar,
  rightPanel,
  overlay,
  snapToGrid,
  snapGrid,
  onSelectionChange,
  onDropItem,
}: WorkspaceCanvasProps) {
  return (
    <div className="flex h-screen flex-col bg-gray-900 text-white">
      <div className="flex items-center justify-between border-b border-gray-700/50 bg-gray-800/80 px-4 py-2.5">
        <div className="flex items-center gap-3">
          <Link
            href={`/workspace/${groupId}`}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white"
          >
            <ArrowLeft size={16} />
            Workspace
          </Link>
          <span className="text-gray-600">/</span>
          <h1 className="text-sm font-semibold text-white">{title}</h1>
          {!isConnected && (
            <span className="rounded bg-amber-900/50 px-2 py-0.5 text-[11px] text-amber-300">
              Reconnecting…
            </span>
          )}
        </div>
        <PresenceBar userIds={presence} currentUserId={currentUserId} />
      </div>

      <div className="flex flex-1 overflow-hidden">
        <ReactFlowProvider>
          {sidebar}
          <CanvasArea
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            toolbar={toolbar}
            overlay={overlay}
            snapToGrid={snapToGrid}
            snapGrid={snapGrid}
            onSelectionChange={onSelectionChange}
            onDropItem={onDropItem}
          />
          {rightPanel}
        </ReactFlowProvider>
      </div>
    </div>
  );
}
