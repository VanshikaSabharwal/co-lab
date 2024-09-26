import WebSocket, { WebSocketServer } from "ws";
import http from "http";
import Express from "express";
import Redis from "ioredis";

const redisSubClient = new Redis();
const redisPublishClient = new Redis();
const redisClient = new Redis();

const app = Express();
const port = 8080;

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

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

    // wss.clients.forEach((client) => {
    //   if (client.readyState === WebSocket.OPEN) {
    //     client.send(message);
    //   } else {
    //     console.log("Skipping broadcast for self: ", message);
    //   }
    // });
  }
});

// WebSocket connection handling
wss.on("connection", (ws) => {
  console.log("Client connected");

  // Handle incoming WebSocket messages
  ws.on("message", async (message) => {
    console.log(" Websocket Received WebSocket message:", message.toString());

    // Publish message to Redis using the dedicated publishing client
    redisPublishClient.publish("chat-channel", message.toString());

    // Cache the message using the regular Redis client
    await redisClient.set(`message:${Date.now()}`, message.toString());
    console.log("Message cached in Redis");
  });

  // Handle WebSocket disconnection
  ws.on("close", () => {
    console.log("WebSocket connection closed");
  });
});

// Start the HTTP server
server.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
