// /api/messages.ts

import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@repo/db/client"; // Adjust the import based on your setup

export async function GET(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { chatId } = req.query;

    const messages = await prisma.message.findMany({
      where: { chatId: String(chatId) },
      orderBy: { timestamp: "asc" }, // Order by time of creation
    });

    return res.status(200).json(messages);
  } catch (err) {
    console.error("Error fetching messages: ", err);
    return res.status(500).json({ error: "Failed to fetch messages" });
  }
}

export async function POST(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { chatId, senderId, content } = req.body;

    const message = await prisma.message.create({
      data: {
        chatId,
        senderId,
        content,
        isDelivered: false,
        sender: senderId,
        timestamp: new Date(),
        recipientId: chatId,
        chat: content,
      },
    });

    return res.status(200).json(message);
  } catch (err) {
    console.error("Error saving message: ", err);
    return res.status(500).json({ error: "Failed to save message" });
  }
}
