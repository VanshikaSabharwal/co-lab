import express from "express";
import { WebSocketServer, WebSocket } from "ws";
import type { RawData } from "ws";
import prisma from "@repo/db/index";
import crypto from "crypto"; // Import crypto for encryption

const app = express();
const httpServer = app.listen(8080);

const wss = new WebSocketServer({ server: httpServer });
const clients = new Map<string, WebSocket>();

// Encryption secret key (in a production app, store this securely)
const ENCRYPTION_KEY = "your-32-byte-encryption-key"; // Must be 256 bits (32 characters)
const IV_LENGTH = 16; // AES block size for initialization vector

// Function to encrypt the message
function encryptMessage(message: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(
    "aes-256-cbc",
    Buffer.from(ENCRYPTION_KEY),
    iv
  );
  let encrypted = cipher.update(message, "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}:${encrypted}`; // Store both IV and encrypted message
}

// Function to decrypt the message
function decryptMessage(encryptedMessage: string): string {
  const [iv, encrypted] = encryptedMessage.split(":");
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    Buffer.from(ENCRYPTION_KEY),
    Buffer.from(iv, "hex")
  );
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

wss.on("connection", function connection(ws: WebSocket) {
  ws.on("error", console.error);

  ws.on("message", async function message(data: RawData, isBinary: boolean) {
    const parsedData = JSON.parse(data.toString());

    if (parsedData.type === "register") {
      const chatId = parsedData.chatId;
      clients.set(chatId, ws);
      console.log(`Client with chatId ${chatId} connected`);
      return;
    }

    if (parsedData.type === "message") {
      const {
        senderId,
        chatId,
        content,
        recipientId,
      }: {
        senderId: string;
        chatId: string;
        content: string;
        recipientId: string;
      } = parsedData;

      try {
        // Encrypt the message content
        const encryptedContent = encryptMessage(content);

        // Store the encrypted message in the database
        const newMessage = await prisma.message.create({
          data: {
            content: encryptedContent, // Store the encrypted message
            senderId,
            chatId,
            recipientId,
            isDelivered: false,
          },
        });
        console.log(`Message stored in DB with ID: ${newMessage.id}`);

        const recipientSocket = clients.get(recipientId);

        // If the recipient is online, forward the message
        if (recipientSocket && recipientSocket.readyState === WebSocket.OPEN) {
          recipientSocket.send(
            JSON.stringify({
              senderId,
              message: content, // Send the original message, not the encrypted one
            })
          );
          await prisma.message.update({
            where: { id: newMessage.id },
            data: { isDelivered: true },
          });
        } else {
          console.log(`Recipient ${recipientId} is offline. Storing message.`);

          // Store the message as undelivered for the recipient
          await prisma.message.create({
            data: {
              content: encryptedContent, // Store encrypted message
              senderId,
              chatId,
              recipientId, // Store the recipientId for tracking offline messages
              isDelivered: false, // Mark message as undelivered
            },
          });

          // Optionally, notify the sender that the recipient is offline
          ws.send(
            JSON.stringify({
              type: "info",
              message: `Recipient is offline. Your message will be delivered when they reconnect.`,
            })
          );
        }
      } catch (error) {
        console.error("Error processing message:", error);
        ws.send(
          JSON.stringify({
            type: "error",
            message: "An error occurred while sending the message.",
          })
        );
      }
    }
  });
});

// Function to handle undelivered messages when the recipient reconnects
wss.on("connection", async (ws: WebSocket) => {
  ws.on("message", async function (data: RawData) {
    const parsedData = JSON.parse(data.toString());

    if (parsedData.type === "register") {
      const { chatId } = parsedData;

      // Find all undelivered messages for the user
      const undeliveredMessages = await prisma.message.findMany({
        where: {
          recipientId: chatId,
          isDelivered: false, // Only fetch undelivered messages
        },
      });

      // Send undelivered messages to the user
      for (const message of undeliveredMessages) {
        // Decrypt the message content before sending
        const decryptedMessage = decryptMessage(message.content);

        ws.send(
          JSON.stringify({
            senderId: message.senderId,
            message: decryptedMessage, // Send the decrypted message
          })
        );

        // Mark the message as delivered in the database
        await prisma.message.update({
          where: { id: message.id },
          data: { isDelivered: true },
        });
      }
    }
  });
});
