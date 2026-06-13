import WebSocket, { WebSocketServer } from "ws";
import http from "http";
import Express from "express";

const app = Express();
const port = 8080;

// ── Allowed origins (set WS_ALLOWED_ORIGINS in your .env) ──────────────────
const ALLOWED_ORIGINS = process.env.WS_ALLOWED_ORIGINS
  ? process.env.WS_ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : ["http://localhost:3000"];

// ── Per-connection message rate limiting ────────────────────────────────────
const MAX_MESSAGES_PER_SECOND = 10;
const MAX_MESSAGE_SIZE_BYTES = 8_000; // 8KB per message
const MAX_CONNECTIONS_PER_IP = 5;

// Track connection counts per IP to limit simultaneous connections
const ipConnectionCount = new Map<string, number>();

// ── Security middleware for Express ────────────────────────────────────────
app.disable("x-powered-by"); // Don't leak Express version
app.use(Express.json({ limit: "50kb" })); // Limit body size
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  next();
});

const server = http.createServer(app);

const wss = new WebSocketServer({
  server,
  path: "/ws",

  // Validate origin before the WebSocket handshake completes
  verifyClient: ({ origin, req }, callback) => {
    const clientIP =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      "unknown";

    // ── Origin check (prevents WebSocket hijacking from other sites) ────────
    if (origin && !ALLOWED_ORIGINS.includes(origin)) {
      console.warn(`🚫 Rejected WS connection from unauthorized origin: ${origin}`);
      callback(false, 403, "Forbidden");
      return;
    }

    // ── Per-IP connection limit ─────────────────────────────────────────────
    const currentCount = ipConnectionCount.get(clientIP) || 0;
    if (currentCount >= MAX_CONNECTIONS_PER_IP) {
      console.warn(`🚫 Too many connections from IP: ${clientIP}`);
      callback(false, 429, "Too Many Connections");
      return;
    }

    ipConnectionCount.set(clientIP, currentCount + 1);
    callback(true);
  },
});

const groupClients = new Map<string, Map<string, WebSocket>>();
const individualClients = new Map<string, WebSocket>();

// ── Call signaling helper ────────────────────────────────────────────────────
function handleCallSignal(ws: WebSocket, msg: any, senderId: string) {
  switch (msg.type) {
    case "call_offer": {
      if (msg.groupId) {
        // Broadcast to all connected group members
        const members = groupClients.get(msg.groupId);
        if (members) {
          const outbound = JSON.stringify({
            type: "call_offer",
            callId: msg.callId,
            roomName: msg.roomName,
            callerId: senderId,
            callerName: msg.callerName,
            callType: msg.callType,
            groupId: msg.groupId,
          });
          for (const [mid, mws] of members) {
            if (mid !== senderId && mws.readyState === WebSocket.OPEN) {
              mws.send(outbound);
            }
          }
        }
      } else if (msg.targetId) {
        // Route to specific recipient
        const targetWs = individualClients.get(msg.targetId);
        if (targetWs?.readyState === WebSocket.OPEN) {
          targetWs.send(JSON.stringify({
            type: "call_offer",
            callId: msg.callId,
            roomName: msg.roomName,
            callerId: senderId,
            callerName: msg.callerName,
            callType: msg.callType,
            targetId: msg.targetId,
          }));
          ws.send(JSON.stringify({ type: "call_offered", callId: msg.callId }));
        } else {
          ws.send(JSON.stringify({
            type: "error",
            message: "Recipient not connected",
            callId: msg.callId,
          }));
        }
      }
      break;
    }

    case "call_accepted": {
      const initiatorWs = individualClients.get(msg.initiatorId);
      if (initiatorWs?.readyState === WebSocket.OPEN) {
        initiatorWs.send(JSON.stringify({
          type: "call_accepted",
          callId: msg.callId,
          roomName: msg.roomName,
          token: msg.token,
          participantId: senderId,
        }));
      }
      break;
    }

    case "call_rejected": {
      const initiatorWs = individualClients.get(msg.initiatorId);
      if (initiatorWs?.readyState === WebSocket.OPEN) {
        initiatorWs.send(JSON.stringify({
          type: "call_rejected",
          callId: msg.callId,
          reason: msg.reason || "rejected",
        }));
      }
      break;
    }

    case "call_ended": {
      // Broadcast to all participants if groupId provided
      if (msg.groupId) {
        const members = groupClients.get(msg.groupId);
        if (members) {
          const outbound = JSON.stringify({
            type: "call_ended",
            callId: msg.callId,
            endedBy: senderId,
          });
          for (const [mid, mws] of members) {
            if (mid !== senderId && mws.readyState === WebSocket.OPEN) {
              mws.send(outbound);
            }
          }
        }
      }
      // Also notify individual participant if targetId provided
      if (msg.targetId) {
        const targetWs = individualClients.get(msg.targetId);
        if (targetWs?.readyState === WebSocket.OPEN) {
          targetWs.send(JSON.stringify({
            type: "call_ended",
            callId: msg.callId,
            endedBy: senderId,
          }));
        }
      }
      break;
    }

    case "call_missed": {
      const callerWs = individualClients.get(msg.callerId);
      if (callerWs?.readyState === WebSocket.OPEN) {
        callerWs.send(JSON.stringify({
          type: "call_missed",
          callId: msg.callId,
          targetId: senderId,
        }));
      }
      break;
    }

    default:
      ws.send(JSON.stringify({ type: "error", message: "Unknown call signal type" }));
  }
}

// ── Server-side heartbeat (detects and removes zombie connections) ───────────
// Many proxies/load balancers kill idle TCP connections after 60s.
// Ping every 30s; terminate any client that doesn't pong back.
const wsIsAlive = new Map<WebSocket, boolean>();

const serverHeartbeat = setInterval(() => {
  wss.clients.forEach((client) => {
    if (!wsIsAlive.get(client)) {
      client.terminate();
      return;
    }
    wsIsAlive.set(client, false);
    client.ping();
  });
}, 30_000);

wss.on("close", () => clearInterval(serverHeartbeat));

wss.on("connection", (ws, req) => {
  const clientIP =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket.remoteAddress ||
    "unknown";

  const urlParams = new URLSearchParams(req.url?.split("?")[1] || "");
  const userId = urlParams.get("userId");
  const groupId = urlParams.get("groupId");

  if (!userId) {
    ws.close(1008, "UserId required");
    return;
  }

  // ── Basic userId validation (alphanumeric + hyphens only) ──────────────
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(userId)) {
    ws.close(1008, "Invalid userId format");
    return;
  }

  // Track liveness for heartbeat
  wsIsAlive.set(ws, true);
  ws.on("pong", () => wsIsAlive.set(ws, true));

  individualClients.set(userId, ws);

  if (groupId && /^[a-zA-Z0-9_-]{1,64}$/.test(groupId)) {
    if (!groupClients.has(groupId)) {
      groupClients.set(groupId, new Map());
    }
    groupClients.get(groupId)!.set(userId, ws);
  }

  ws.send(
    JSON.stringify({
      type: "connection_established",
      message: "Connected successfully",
      userId,
    }),
  );

  // ── Per-connection rate limiting ────────────────────────────────────────
  let messageCount = 0;
  const rateLimitWindow = setInterval(() => {
    messageCount = 0;
  }, 1000);

  ws.on("message", (rawMessage, isBinary) => {
    // Block binary frames
    if (isBinary) {
      ws.send(JSON.stringify({ type: "error", message: "Binary messages not supported" }));
      return;
    }

    // ── Message size check ────────────────────────────────────────────────
    const messageStr = rawMessage.toString();
    if (messageStr.length > MAX_MESSAGE_SIZE_BYTES) {
      ws.send(JSON.stringify({ type: "error", message: "Message too large" }));
      return;
    }

    // ── Rate limit per connection ─────────────────────────────────────────
    messageCount++;
    if (messageCount > MAX_MESSAGES_PER_SECOND) {
      ws.send(JSON.stringify({ type: "error", message: "Rate limit exceeded" }));
      return;
    }

    try {
      const parsedMessage = JSON.parse(messageStr);

      // ── Application-level ping (client keepalive) ─────────────────────
      if (parsedMessage.type === "ping") {
        ws.send(JSON.stringify({ type: "pong" }));
        return;
      }

      // ── Read receipt: recipient tells sender messages were read ────────
      if (parsedMessage.type === "read_receipt") {
        const senderWs = individualClients.get(parsedMessage.senderId);
        if (senderWs && senderWs.readyState === WebSocket.OPEN) {
          senderWs.send(JSON.stringify({
            type: "read_receipt",
            chatId: parsedMessage.chatId,
            readBy: userId,
          }));
        }
        return;
      }

      // ── Group context registration ────────────────────────────────────
      if (parsedMessage.type === "join_group" && parsedMessage.groupId) {
        const gId = parsedMessage.groupId;
        if (!groupClients.has(gId)) {
          groupClients.set(gId, new Map());
        }
        groupClients.get(gId)!.set(userId, ws);
        ws.send(JSON.stringify({ type: "joined_group", groupId: gId }));
        return;
      }

      if (parsedMessage.type === "leave_group" && parsedMessage.groupId) {
        const gId = parsedMessage.groupId;
        const members = groupClients.get(gId);
        if (members) {
          members.delete(userId);
          if (members.size === 0) groupClients.delete(gId);
        }
        return;
      }

      // ── Call signaling ─────────────────────────────────────────────────
      if (parsedMessage.type.startsWith("call_")) {
        handleCallSignal(ws, parsedMessage, userId);
        return;
      }

      // ── Validate required fields ──────────────────────────────────────
      if (typeof parsedMessage.content !== "string" || parsedMessage.content.trim() === "") {
        ws.send(JSON.stringify({ type: "error", message: "Invalid message format" }));
        return;
      }

      // ── Sanitize content length ───────────────────────────────────────
      if (parsedMessage.content.length > 4000) {
        ws.send(JSON.stringify({ type: "error", message: "Message content too long" }));
        return;
      }

      // One-to-one messaging
      if (parsedMessage.recipientId) {
        const recipientWs = individualClients.get(parsedMessage.recipientId);
        if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
          recipientWs.send(
            JSON.stringify({
              chatId: parsedMessage.chatId,
              senderId: userId,
              recipientId: parsedMessage.recipientId,
              content: parsedMessage.content,
              timestamp: parsedMessage.timestamp || Date.now(),
            }),
          );
          ws.send(
            JSON.stringify({
              type: "message_delivered",
              chatId: parsedMessage.chatId,
              timestamp: parsedMessage.timestamp,
            }),
          );
        } else {
          ws.send(
            JSON.stringify({
              type: "error",
              message: "Recipient not connected",
            }),
          );
        }
        return;
      }

      // Group messaging — broadcast to all members of the group
      if (parsedMessage.groupId) {
        const members = groupClients.get(parsedMessage.groupId);
        if (members) {
          const outbound = JSON.stringify({
            id: parsedMessage.id,
            senderId: userId,
            senderName: parsedMessage.senderName,
            groupId: parsedMessage.groupId,
            content: parsedMessage.content,
            createdAt: Date.now(),
          });
          for (const [memberId, memberWs] of members.entries()) {
            if (memberId !== userId && memberWs.readyState === WebSocket.OPEN) {
              memberWs.send(outbound);
            }
          }
        }
      }
    } catch {
      ws.send(JSON.stringify({ type: "error", message: "Invalid JSON" }));
    }
  });

  ws.on("close", () => {
    wsIsAlive.delete(ws);

    // Decrement IP connection count
    const count = ipConnectionCount.get(clientIP) || 1;
    if (count <= 1) {
      ipConnectionCount.delete(clientIP);
    } else {
      ipConnectionCount.set(clientIP, count - 1);
    }

    clearInterval(rateLimitWindow);

    if (individualClients.get(userId) === ws) {
      individualClients.delete(userId);
    }
    for (const [gId, clients] of groupClients.entries()) {
      if (clients.has(userId)) {
        clients.delete(userId);
        if (clients.size === 0) groupClients.delete(gId);
      }
    }
  });

  ws.on("error", (error) => {
    console.error(`WebSocket error for ${userId}:`, error.message);
  });
});

// ── Health check (internal use only — protect this in production) ──────────
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    connectedClients: individualClients.size,
    activeGroups: groupClients.size,
  });
});

server.listen(port, () => {
  console.log(`🚀 WebSocket server running on port ${port}`);
});

export { wss, individualClients, groupClients };
