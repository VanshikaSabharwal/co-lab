import WebSocket, { WebSocketServer } from "ws";
import express from "express";
import http from "http";

const app = express();
const port = 8080;

// Create an HTTP server and pass it to Express
const server = http.createServer(app);

// Create a WebSocket server using the HTTP server
const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  console.log("New WebSocket connection");

  // Handle incoming messages
  ws.on("message", async (message) => {
    try {
      // Broadcast message to all connected clients
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
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
