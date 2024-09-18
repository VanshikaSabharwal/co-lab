import WebSocket, { WebSocketServer } from "ws";
import express from "express";
import http from "http";
import Redis from "ioredis";
import prisma from "@repo/db/index";

const app = express();
const port = 8080;

const redisPublisher = new Redis();
const redisSubscriber = new Redis();
const redis = new Redis();

// Create an HTTP server and pass it to Express
const server = http.createServer(app);

// Create a WebSocket server using the HTTP server
const wss = new WebSocketServer({ server });

// redis subscribe
// subscribe to redis for incoming messsage
redisSubscriber.subscribe("chat-channel", (err, count) => {
  if (err) {
    console.log("Failed to subscribe, Err:", err);
  } else {
    console.log(`Subscribed to ${count} channel(s).`);
  }
});

// broadcast msg recieved by redis to clients
redisSubscriber.on("message", (channel, message) => {
  if (channel === "chat-channel") {
    // broadcast msg to all channels
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }
});

wss.on("connection", (ws) => {
  console.log("New WebSocket connection");

  // Handle incoming messages
  ws.on("message", async (message) => {
    const parsedMessage = JSON.parse(message.toString());
    try {
      const { content, senderId, chatId, recipientId } = parsedMessage;
      const savedData = await prisma.message.create({
        data: {
          content,
          senderId,
          chatId,
          recipientId,
          isDelivered: false,
        },
      });
      console.log("Messages: ", savedData);
      // 1. cache msg in redis
      redis.lpush("recent-messaages", JSON.stringify(savedData));
      // 2. publish msg to redis to let all users see it
      redisPublisher.publish("chat-channel", message.toString());
      // limit cache size
      await redis.ltrim("recent-messages", 0, 99);

      // Broadcast message to all connected clients via redis

      // wss.clients.forEach((client) => {
      //   if (client.readyState === WebSocket.OPEN) {
      //     client.send(message);
      //   }
      // });
    } catch (err) {
      console.error("Error processing message: ", err);
    }
  });

  // Handle when the connection is closed
  ws.on("close", () => {
    console.log("WebSocket connection closed");
  });
});

// Start the HTTP server and WebSocket server on the same port
server.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
