"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { v4 as uuid } from "uuid";
import type { Edge, Node, NodeChange, NodeTypes, OnSelectionChangeFunc } from "@xyflow/react";
import { useWorkspaceBoard, type PeerCursorOp } from "../../lib/useWorkspaceBoard";
import WorkspaceCanvas from "../../components/WorkspaceCanvas";
import CursorLayer from "../../components/CursorLayer";
import UiPalette from "./UiPalette";
import UiPrimitiveNode, { UI_PALETTE, DEVICE_FRAMES, type UiKind } from "./UiPrimitiveNode";
import PropertiesPanel from "./PropertiesPanel";
import BoardToolbar from "./BoardToolbar";
import { buildTemplateNodes } from "./templates";

interface UiDesignProps {
  groupId: string;
}

const NODE_TYPES: NodeTypes = { uiPrimitive: UiPrimitiveNode };
const HISTORY_LIMIT = 50;

type Snapshot = { nodes: Node[]; edges: Edge[] };

// Strip render-injected callbacks before storing/cloning node data
function cleanData(data: Record<string, unknown>) {
  const { onChange: _onChange, ...rest } = data;
  return rest;
}

function isTypingTarget(el: EventTarget | null) {
  const tag = (el as HTMLElement)?.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || (el as HTMLElement)?.isContentEditable;
}

export default function UiDesign({ groupId }: UiDesignProps) {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const userName = session?.user?.name || session?.user?.email?.split("@")[0] || "Someone";

  // CursorLayer registers its handler here; the board hook feeds it peer ops.
  const cursorHandlerRef = useRef<((op: PeerCursorOp) => void) | null>(null);
  const subscribeCursor = useCallback((handler: (op: PeerCursorOp) => void) => {
    cursorHandlerRef.current = handler;
  }, []);
  const onPeerCursor = useCallback((op: PeerCursorOp) => {
    cursorHandlerRef.current?.(op);
  }, []);

  const {
    nodes,
    edges,
    presence,
    isOffline,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    addNodes,
    updateNode,
    updateNodeData,
    setGraph,
    sendCursor,
  } = useWorkspaceBoard({ groupId, type: "UI_DESIGN", slug: "ui-design", userId, onPeerCursor });

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [snap, setSnap] = useState(false);

  // ── Undo / redo (structural changes: add, delete, duplicate, template) ──
  const undoStack = useRef<Snapshot[]>([]);
  const redoStack = useRef<Snapshot[]>([]);
  const [historyVersion, setHistoryVersion] = useState(0); // re-render for button state
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const edgesRef = useRef(edges);
  edgesRef.current = edges;

  const snapshotNow = useCallback(
    (): Snapshot => ({
      nodes: nodesRef.current.map((n) => ({ ...n, data: cleanData(n.data) })),
      edges: [...edgesRef.current],
    }),
    [],
  );

  const pushHistory = useCallback(() => {
    undoStack.current.push(snapshotNow());
    if (undoStack.current.length > HISTORY_LIMIT) undoStack.current.shift();
    redoStack.current = [];
    setHistoryVersion((v) => v + 1);
  }, [snapshotNow]);

  const undo = useCallback(() => {
    const snapshot = undoStack.current.pop();
    if (!snapshot) return;
    redoStack.current.push(snapshotNow());
    setGraph(snapshot.nodes, snapshot.edges);
    setHistoryVersion((v) => v + 1);
  }, [setGraph, snapshotNow]);

  const redo = useCallback(() => {
    const snapshot = redoStack.current.pop();
    if (!snapshot) return;
    undoStack.current.push(snapshotNow());
    setGraph(snapshot.nodes, snapshot.edges);
    setHistoryVersion((v) => v + 1);
  }, [setGraph, snapshotNow]);

  // Capture deletions triggered by xyflow (Backspace/Delete) in the history
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      if (changes.some((c) => c.type === "remove")) pushHistory();
      onNodesChange(changes);
    },
    [onNodesChange, pushHistory],
  );

  // ── Selection ──
  const onSelectionChange: OnSelectionChangeFunc = useCallback(({ nodes: sel }) => {
    setSelectedIds(sel.map((n) => n.id));
  }, []);
  const selectedNode = useMemo(
    () => (selectedIds.length === 1 ? (nodes.find((n) => n.id === selectedIds[0]) ?? null) : null),
    [nodes, selectedIds],
  );

  // ── Actions ──
  const duplicateSelection = useCallback(() => {
    const selected = nodesRef.current.filter((n) => selectedIds.includes(n.id));
    if (!selected.length) return;
    pushHistory();
    const clones = selected.map((n) => ({
      ...n,
      id: uuid(),
      position: { x: n.position.x + 16, y: n.position.y + 16 },
      selected: false,
      data: cleanData(n.data),
    }));
    addNodes(clones);
  }, [selectedIds, addNodes, pushHistory]);

  const deleteSelection = useCallback(() => {
    if (!selectedIds.length) return;
    const edgeRemovals = edgesRef.current
      .filter((e) => selectedIds.includes(e.source) || selectedIds.includes(e.target))
      .map((e) => ({ id: e.id, type: "remove" as const }));
    // handleNodesChange pushes history for remove changes
    handleNodesChange(selectedIds.map((id) => ({ id, type: "remove" as const })));
    if (edgeRemovals.length) onEdgesChange(edgeRemovals);
    setSelectedIds([]);
  }, [selectedIds, handleNodesChange, onEdgesChange]);

  const nudgeSelection = useCallback(
    (dx: number, dy: number) => {
      const selected = nodesRef.current.filter((n) => selectedIds.includes(n.id));
      if (!selected.length) return;
      onNodesChange(
        selected.map((n) => ({
          id: n.id,
          type: "position" as const,
          position: { x: n.position.x + dx, y: n.position.y + dy },
          dragging: false,
        })),
      );
    },
    [selectedIds, onNodesChange],
  );

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
        e.preventDefault();
        duplicateSelection();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      const step = e.shiftKey ? 10 : 2;
      if (e.key === "ArrowUp") { e.preventDefault(); nudgeSelection(0, -step); }
      else if (e.key === "ArrowDown") { e.preventDefault(); nudgeSelection(0, step); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); nudgeSelection(-step, 0); }
      else if (e.key === "ArrowRight") { e.preventDefault(); nudgeSelection(step, 0); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [duplicateSelection, nudgeSelection, undo, redo]);

  // ── Render ──
  const displayNodes = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        data: {
          ...n.data,
          onChange: (label: string) => updateNodeData(n.id, { label }),
        },
      })),
    [nodes, updateNodeData],
  );

  const handleDropItem = (payload: string, position: { x: number; y: number }) => {
    // Template: instantiate a saved arrangement
    if (payload.startsWith("template:")) {
      pushHistory();
      addNodes(buildTemplateNodes(payload.slice("template:".length), position));
      return;
    }
    // Device frame preset
    if (payload.startsWith("frame:")) {
      const preset = DEVICE_FRAMES.find((f) => f.id === payload.slice("frame:".length));
      if (!preset) return;
      pushHistory();
      addNode({
        id: uuid(),
        type: "uiPrimitive",
        position,
        zIndex: 0,
        style: { width: preset.width, height: preset.height },
        data: { kind: "frame" as UiKind, label: preset.label },
      });
      return;
    }
    // Plain primitive
    const item = UI_PALETTE.find((p) => p.kind === payload);
    if (!item) return;
    pushHistory();
    addNode({
      id: uuid(),
      type: "uiPrimitive",
      position,
      style: { width: item.width, height: item.height },
      data: { kind: item.kind, label: "" },
    });
  };

  // historyVersion re-renders this component so button state stays fresh
  void historyVersion;
  const canUndo = undoStack.current.length > 0;
  const canRedo = redoStack.current.length > 0;

  return (
    <WorkspaceCanvas
      groupId={groupId}
      title="UI/UX Design"
      nodes={displayNodes}
      edges={edges}
      nodeTypes={NODE_TYPES}
      presence={presence}
      currentUserId={userId}
      isOffline={isOffline}
      onNodesChange={handleNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      onSelectionChange={onSelectionChange}
      snapToGrid={snap}
      snapGrid={[8, 8]}
      // Render prop so the palette gets an insert-at-centre callback for taps —
      // HTML5 drag events never fire on touch, which left this board unusable
      // on mobile.
      renderSidebar={(insertAtCenter) => <UiPalette onPick={insertAtCenter} />}
      rightPanel={
        <PropertiesPanel
          node={selectedNode}
          onPatchData={updateNodeData}
          onPatchNode={updateNode}
          onDuplicate={duplicateSelection}
          onDelete={deleteSelection}
        />
      }
      toolbar={
        <BoardToolbar
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={undo}
          onRedo={redo}
          snap={snap}
          onToggleSnap={() => setSnap((s) => !s)}
        />
      }
      overlay={
        <CursorLayer
          userId={userId}
          userName={userName}
          subscribe={subscribeCursor}
          sendCursor={sendCursor}
        />
      }
      onDropItem={handleDropItem}
    />
  );
}
