import WebSocket, { WebSocketServer } from "ws";
import http from "http";
import Express from "express";

const app = Express();
const port = 8080;

app.use(Express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const groupClients = new Map();
const individualClients = new Map();

// WebSocket connection handling
wss.on("connection", (ws, req) => {
  console.log("Client connected");

  const urlParams = new URLSearchParams(req.url.split("?")[1]);
  const userId = urlParams.get("userId");
  const groupId = urlParams.get("groupId");

  if (userId) {
    individualClients.set(userId, ws);
    console.log("Client connected", userId);
  }

  if (groupId) {
    if (!groupClients.has(groupId)) {
      groupClients.set(groupId, new Map());
    }
    groupClients.get(groupId).set(userId, ws);
    console.log(`Client ${userId} joined group ${groupId}`);
  }

  // WebSocket message handling
  ws.on("message", (message) => {
    console.log("WebSocket received message:", message.toString());
    const parsedMessage = JSON.parse(message.toString());

    // Broadcast the message to all clients in the group
    if (parsedMessage.groupId && groupClients.has(parsedMessage.groupId)) {
      const groupMembers = groupClients.get(parsedMessage.groupId);
      groupMembers.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(parsedMessage));
        }
      });
    }
  });

  // Handle WebSocket disconnection
  ws.on("close", () => {
    console.log("WebSocket connection closed");

    // Remove the client from individual tracking
    for (const [id, client] of individualClients.entries()) {
      if (client === ws) {
        individualClients.delete(id);
        console.log(`Client ${id} removed from individual tracking`);
        break;
      }
    }

    // Remove the client from any groups they are part of
    for (const [gId, clients] of groupClients.entries()) {
      for (const [uId, client] of clients.entries()) {
        if (client === ws) {
          clients.delete(uId);
          console.log(`Client ${uId} removed from group ${gId}`);
          if (clients.size === 0) {
            groupClients.delete(gId);
            console.log(`Group ${gId} removed as it has no more clients`);
          }
          break;
        }
      }
    }
  });
});

// Start the HTTP server
server.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
