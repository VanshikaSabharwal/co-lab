import { Kafka, Partitioners } from "kafkajs";
import fs from "fs";
import path from "path";
import prisma from "./prismaClient";
import redis from "./redisClient";

const kafka = new Kafka({
  brokers: ["kafka-11270cff-chat-room.l.aivencloud.com:17649"],
  ssl: {
    ca: [fs.readFileSync(path.resolve("./ca.pem"), "utf-8")],
  },
  sasl: {
    mechanism: "plain",
    username: process.env.KAFKA_USERNAME,
    password: process.env.KAFKA_PASSWORD,
  },
});

// Producer Setup
const producer = kafka.producer({
  createPartitioner: Partitioners.LegacyPartitioner,
});
const runProducer = async () => {
  try {
    await producer.connect();
    console.log("Producer connected");

    const sendMessage = async (topic, message) => {
      try {
        await producer.send({ topic, messages: [{ value: message }] });
        console.log(`Message sent to ${topic}`);
      } catch (error) {
        console.log("Error sending message:", error);
      }
    };

    return { sendMessage };
  } catch (err) {
    console.log("Producer connection error:", err);
    throw err;
  }
};

// Consumer Setup
const consumer = kafka.consumer({ groupId: "test-group" });
let isConsumerRunning = false;

const runConsumer = async () => {
  if (isConsumerRunning) return; // Prevent multiple consumers
  isConsumerRunning = true;

  await consumer.connect();
  await consumer.subscribe({ topic: "MESSAGES", fromBeginning: true });
  console.log("Kafka consumer connected");

  const processedMessageIds = new Set(); // Track processed message IDs

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const messageId = message.key
        ? message.key.toString()
        : message.offset.toString();
      if (processedMessageIds.has(messageId)) {
        console.log("Duplicate message, skipping:", messageId);
        return; // Skip if already processed
      }

      processedMessageIds.add(messageId); // Add ID to the set

      let messageData;
      try {
        messageData = JSON.parse(message.value.toString());
      } catch (err) {
        console.log("Error parsing message:", err);
        return;
      }

      try {
        const newMessage = await prisma.messages.create({
          data: {
            content: messageData.content,
            senderId: messageData.senderId,
            chatId: messageData.chatId,
            recipientId: messageData.recipientId,
          },
        });
        console.log("Message saved to database");

        // Caching
        const redisKey = `message:${newMessage.id}`;
        await redis.set(redisKey, JSON.stringify(newMessage));
        const cachedMessage = await redis.get(redisKey);
        console.log("Cached message from Redis:", cachedMessage);
      } catch (err) {
        console.log("Error saving message:", err);
      }
    },
  });

  // Cleanup on process termination
  const cleanup = async () => {
    console.log("Closing Kafka consumer and Redis client");
    isConsumerRunning = false;
    await consumer.disconnect();
    await redis.quit();
    process.exit(0);
  };

  process.on("SIGTERM", cleanup);
  process.on("SIGINT", cleanup);
};

// Run Producer and Consumer
const start = async () => {
  await runProducer();
  await runConsumer();
};

start().catch(console.error);

export { runProducer, runConsumer };
