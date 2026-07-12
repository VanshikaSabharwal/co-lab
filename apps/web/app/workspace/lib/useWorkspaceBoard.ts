"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  applyEdgeChanges,
  applyNodeChanges,
  addEdge,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from "@xyflow/react";
import { useWorkspaceSocket, type WorkspaceBoardType } from "./useWorkspaceSocket";

type GraphBoardOp =
  | { action: "nodes_change"; changes: NodeChange[] }
  | { action: "edges_change"; changes: EdgeChange[] }
  | { action: "connect"; connection: Connection }
  | { action: "node_add"; node: Node }
  | { action: "nodes_add"; nodes: Node[] }
  | { action: "node_update"; id: string; patch: Partial<Node> }
  | { action: "node_data_update"; id: string; data: Record<string, unknown> }
  | { action: "edge_label_update"; id: string; label: string }
  | { action: "replace"; nodes: Node[]; edges: Edge[] };

// Transient ops (cursors etc.) share the WS channel but never touch board state.
export interface PeerCursorOp {
  action: "cursor";
  userId: string;
  name: string;
  x: number;
  y: number;
}

interface UseWorkspaceBoardOptions {
  groupId: string;
  type: WorkspaceBoardType;
  slug: string;
  userId: string | undefined;
  /** Optional hook for transient peer ops (live cursors). */
  onPeerCursor?: (op: PeerCursorOp) => void;
}

const SAVE_DEBOUNCE_MS = 1500;

// Shared load/save/sync logic for the three node-graph workspace boards
// (mind map, DB schema, UI design). Planning & milestones uses its own
// hook since its content shape (columns/cards/milestones) isn't a graph.
export function useWorkspaceBoard({ groupId, type, slug, userId, onPeerCursor }: UseWorkspaceBoardOptions) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onPeerCursorRef = useRef(onPeerCursor);
  onPeerCursorRef.current = onPeerCursor;

  const applyRemoteOp = useCallback((op: GraphBoardOp | PeerCursorOp) => {
    if (op.action === "cursor") {
      onPeerCursorRef.current?.(op);
      return;
    }
    switch (op.action) {
      case "nodes_change":
        setNodes((nds) => applyNodeChanges(op.changes, nds));
        break;
      case "edges_change":
        setEdges((eds) => applyEdgeChanges(op.changes, eds));
        break;
      case "connect":
        setEdges((eds) => addEdge(op.connection, eds));
        break;
      case "node_add":
        setNodes((nds) => [...nds, op.node]);
        break;
      case "nodes_add":
        setNodes((nds) => [...nds, ...op.nodes]);
        break;
      case "node_update":
        setNodes((nds) => nds.map((n) => (n.id === op.id ? ({ ...n, ...op.patch } as Node) : n)));
        break;
      case "replace":
        setNodes(op.nodes);
        setEdges(op.edges);
        break;
      case "node_data_update":
        setNodes((nds) =>
          nds.map((n) => (n.id === op.id ? { ...n, data: { ...n.data, ...op.data } } : n)),
        );
        break;
      case "edge_label_update":
        setEdges((eds) => eds.map((e) => (e.id === op.id ? { ...e, label: op.label } : e)));
        break;
    }
  }, []);

  const { isConnected, presence, sendOp } = useWorkspaceSocket({
    groupId,
    board: type,
    userId,
    onRemoteOp: applyRemoteOp,
  });

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    fetch(`/api/workspace/${groupId}/${slug}?userId=${userId}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setNodes(data.content?.nodes ?? []);
        setEdges(data.content?.edges ?? []);
        setUpdatedAt(data.updatedAt ?? null);
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [groupId, slug, userId]);

  useEffect(() => {
    if (!loaded || !userId) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      fetch(`/api/workspace/${groupId}/${slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, content: { nodes, edges } }),
      })
        .then((res) => res.json())
        .then((data) => setUpdatedAt(data.updatedAt ?? null))
        .catch(() => {});
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [nodes, edges, loaded, groupId, slug, userId]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((nds) => applyNodeChanges(changes, nds));
      sendOp({ action: "nodes_change", changes });
    },
    [sendOp],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges((eds) => applyEdgeChanges(changes, eds));
      sendOp({ action: "edges_change", changes });
    },
    [sendOp],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge(connection, eds));
      sendOp({ action: "connect", connection });
    },
    [sendOp],
  );

  const addNode = useCallback(
    (node: Node) => {
      setNodes((nds) => [...nds, node]);
      sendOp({ action: "node_add", node });
    },
    [sendOp],
  );

  const updateNodeData = useCallback(
    (id: string, data: Record<string, unknown>) => {
      setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...data } } : n)));
      sendOp({ action: "node_data_update", id, data });
    },
    [sendOp],
  );

  const updateEdgeLabel = useCallback(
    (id: string, label: string) => {
      setEdges((eds) => eds.map((e) => (e.id === id ? { ...e, label } : e)));
      sendOp({ action: "edge_label_update", id, label });
    },
    [sendOp],
  );

  const addNodes = useCallback(
    (newNodes: Node[]) => {
      setNodes((nds) => [...nds, ...newNodes]);
      sendOp({ action: "nodes_add", nodes: newNodes });
    },
    [sendOp],
  );

  const updateNode = useCallback(
    (id: string, patch: Partial<Node>) => {
      setNodes((nds) => nds.map((n) => (n.id === id ? ({ ...n, ...patch } as Node) : n)));
      sendOp({ action: "node_update", id, patch });
    },
    [sendOp],
  );

  // Replace the whole graph (undo/redo, template insertion into empty board)
  const setGraph = useCallback(
    (nextNodes: Node[], nextEdges: Edge[]) => {
      setNodes(nextNodes);
      setEdges(nextEdges);
      sendOp({ action: "replace", nodes: nextNodes, edges: nextEdges });
    },
    [sendOp],
  );

  // Transient — broadcast only, never persisted
  const sendCursor = useCallback(
    (op: Omit<PeerCursorOp, "action">) => {
      sendOp({ action: "cursor", ...op });
    },
    [sendOp],
  );

  return {
    nodes,
    edges,
    loaded,
    updatedAt,
    isConnected,
    presence,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    addNodes,
    updateNode,
    updateNodeData,
    updateEdgeLabel,
    setGraph,
    sendCursor,
  };
}
