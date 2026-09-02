import { NextRequest, NextResponse } from "next/server";
import prisma from "../../../lib/prisma";
import { getSessionUser, unauthorized } from "../../../lib/apiAuth";
import { uploadAvatar } from "../../../lib/s3";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const me = await getSessionUser();
  if (!me) return unauthorized();

  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Unsupported file type. Use PNG, JPEG, or WebP." },
      { status: 400 },
    );
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "File too large. Max 5MB." }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const image = await uploadAvatar(me.id, buffer, file.type);

    await prisma.user.update({
      where: { id: me.id },
      data: { image },
    });

    return NextResponse.json({ image });
  } catch (err) {
    console.error("Avatar upload failed:", err);
    return NextResponse.json({ error: "Failed to upload avatar" }, { status: 500 });
  }
}
