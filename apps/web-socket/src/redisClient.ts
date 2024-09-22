import { createClient } from "redis";

const redis = createClient({
  url: "redis://localhost:6379", // Update this according to your Redis configuration
});

redis.on("error", (err) => {
  console.error("Redis Client Error", err);
});

const connectRedis = async () => {
  try {
    await redis.connect();
    console.log("Connected to Redis");
  } catch (err) {
    console.error("Error connecting to Redis:", err);
  }
};

connectRedis();

process.on("SIGTERM", async () => {
  console.log("SIGTERM signal received: closing Redis connection");
  await redis.quit();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT signal received: closing Redis connection");
  await redis.quit();
  process.exit(0);
});

export default redis;
