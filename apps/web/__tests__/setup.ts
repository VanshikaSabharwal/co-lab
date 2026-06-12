import "@testing-library/jest-dom";

process.env.LIVEKIT_API_KEY = "test-devkey";
process.env.LIVEKIT_API_SECRET = "test-devsecret";
process.env.LIVEKIT_HOST = "http://localhost:7880";
process.env.NEXT_PUBLIC_LIVEKIT_URL = "ws://localhost:7880";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
