import WebSocket, { WebSocketServer } from "ws";
import http from "http";
import Express from "express";
import Redis from "ioredis";

const redisSubClient = new Redis();
const redisPublishClient = new Redis();
const redisClient = new Redis();

const app = Express();
const port = 8080;

app.use(Express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const groupClients = new Map(); // To track clients in groups
const individualClients = new Map(); // To track individual clients

// Subscribe to Redis channel for incoming messages
redisSubClient.subscribe("chat-channel", (err, count) => {
  if (err) {
    console.error(err);
  } else {
    console.log(`Subscribed to ${count} channels.`);
  }
});

// Broadcast incoming Redis messages to WebSocket clients
redisSubClient.on("message", (channel, message) => {
  if (channel === "chat-channel") {
    console.log("Broadcasting message to WebSocket clients:", message);
    const parsedMessage = JSON.parse(message);
    const { recipientId, groupId } = parsedMessage;

    // Check if the message is for a group or individual
    if (groupId) {
      // Broadcast to all clients in the specified group
      const clients = groupClients.get(groupId) || [];
      clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    } else if (recipientId) {
      // Send to individual recipient
      const recipientClient = individualClients.get(recipientId);
      if (recipientClient && recipientClient.readyState === WebSocket.OPEN) {
        recipientClient.send(message);
      }
    }
  }
});

// WebSocket connection handling
wss.on("connection", (ws, req) => {
  console.log("Client connected");

  // Extract userId from request (assume it's sent in a query parameter)
  const userId = req.url.split("?userId=")[1]; // Example: ?userId=123
  individualClients.set(userId, ws); // Track this client for individual messages

  // Handle incoming WebSocket messages
  ws.on("message", async (message) => {
    console.log("WebSocket received message:", message.toString());
    const parsedMessage = JSON.parse(message.toString());

    // Publish message to Redis
    redisPublishClient.publish("chat-channel", message.toString());

    // Cache the message in Redis
    await redisClient.set(`message:${Date.now()}`, message.toString());
    console.log("Message cached in Redis");

    // If it's a group message, add the client to the group
    if (parsedMessage.groupId) {
      if (!groupClients.has(parsedMessage.groupId)) {
        groupClients.set(parsedMessage.groupId, []);
      }
      groupClients.get(parsedMessage.groupId).push(ws);
    }
  });

  // Handle WebSocket disconnection
  ws.on("close", () => {
    console.log("WebSocket connection closed");
    individualClients.delete(userId); // Remove the client from individual tracking

    // Remove the client from any groups they are part of
    for (const [groupId, clients] of groupClients.entries()) {
      const index = clients.indexOf(ws);
      if (index !== -1) {
        clients.splice(index, 1);
        if (clients.length === 0) {
          groupClients.delete(groupId); // Remove group if no clients left
        }
        break;
      }
    }
  });
});

// Start the HTTP server
server.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
