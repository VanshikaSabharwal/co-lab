import WebSocket, { WebSocketServer } from "ws";
import http from "http";
import Express from "express";

const app = Express();
const port = 8080;

app.use(Express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ 
  server,
  path: "/ws" // Add this to handle /ws path
});

const groupClients = new Map();
const individualClients = new Map();

// WebSocket connection handling
wss.on("connection", (ws, req) => {
  console.log("✅ New WebSocket connection");

  const urlParams = new URLSearchParams(req.url?.split("?")[1] || "");
  const userId = urlParams.get("userId");
  const groupId = urlParams.get("groupId");

  if (!userId) {
    console.log("❌ No userId provided, closing connection");
    ws.close(1008, "UserId required");
    return;
  }

  // Store the connection
  individualClients.set(userId, ws);
  console.log(`✅ Client connected: ${userId}`);

  // Send connection confirmation
  ws.send(JSON.stringify({
    type: "connection_established",
    message: "WebSocket connection established successfully",
    userId: userId
  }));

  // WebSocket message handling
  ws.on("message", (message) => {
    try {
      console.log("📨 Received message:", message.toString());
      const parsedMessage = JSON.parse(message.toString());

      // Validate message structure
      if (!parsedMessage.recipientId || !parsedMessage.content) {
        console.log("❌ Invalid message format");
        ws.send(JSON.stringify({
          type: "error",
          message: "Invalid message format"
        }));
        return;
      }

      // One-to-one message sending
      const recipientWs = individualClients.get(parsedMessage.recipientId);

      if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
        console.log(`📤 Sending message to recipient: ${parsedMessage.recipientId}`);
        recipientWs.send(JSON.stringify({
          ...parsedMessage,
          timestamp: Date.now()
        }));
        
        // Send delivery confirmation to sender
        ws.send(JSON.stringify({
          type: "message_delivered",
          messageId: parsedMessage.timestamp,
          recipientId: parsedMessage.recipientId
        }));
      } else {
        console.log(`❌ Recipient ${parsedMessage.recipientId} not connected`);
        ws.send(JSON.stringify({
          type: "error",
          message: `Recipient ${parsedMessage.recipientId} is not connected`
        }));
      }

    } catch (error) {
      console.error("❌ Error processing message:", error);
      ws.send(JSON.stringify({
        type: "error",
        message: "Error processing message"
      }));
    }
  });

  // Handle WebSocket disconnection
  ws.on("close", (code, reason) => {
    console.log(`🔌 WebSocket connection closed for ${userId}:`, code, reason?.toString());

    // Remove the client from individual tracking
    if (individualClients.get(userId) === ws) {
      individualClients.delete(userId);
      console.log(`✅ Client ${userId} removed from tracking`);
    }

    // Remove from groups
    for (const [gId, clients] of groupClients.entries()) {
      if (clients.has(userId)) {
        clients.delete(userId);
        console.log(`✅ Client ${userId} removed from group ${gId}`);
        if (clients.size === 0) {
          groupClients.delete(gId);
        }
      }
    }
  });

  ws.on("error", (error) => {
    console.error(`❌ WebSocket error for ${userId}:`, error);
  });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    connectedClients: individualClients.size,
    activeGroups: groupClients.size
  });
});

// Get connected clients
app.get("/clients", (req, res) => {
  res.json({
    connectedClients: Array.from(individualClients.keys()),
    activeGroups: Array.from(groupClients.keys()).map(groupId => ({
      groupId,
      members: Array.from(groupClients.get(groupId).keys())
    }))
  });
});

// Start the HTTP server
server.listen(port, () => {
  console.log(`🚀 WebSocket server running on port ${port}`);
  console.log(`📡 WebSocket endpoint: ws://localhost:${port}/ws`);
  console.log(`🏥 Health check: http://localhost:${port}/health`);
});

export { wss, individualClients, groupClients };