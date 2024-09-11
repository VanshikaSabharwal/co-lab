import { NextRequest, NextResponse } from "next/server";
import db from "@repo/db/client";
import bcrypt from "bcrypt";
import { z } from "zod";

// zod schema for validation
const signupSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(50, "Name must be less than 50 characters long"),

  email: z.string().email("Invalid email address").min(1, "Email is required"),

  password: z
    .string()
    .min(6, "Password must be at least 6 characters long")
    .max(100, "Password must be less than 100 characters long"),

  phone: z
    .string()
    .regex(/^[0-9]{10}$/, "Phone number must be exactly 10 digits")
    .optional(),
  otp: z
    .string()
    .min(6, "OTP must be 6 digits")
    .max(6, "OTP must be 6 digits")
    .regex(/^\d+$/, "OTP must contain only digits"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = signupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.message },
        { status: 400 }
      );
    }
    const { name, email, phone, password, otp } = parsed.data;

    // Ensure phone is a string (provide a fallback if undefined)
    const userPhone = phone ?? ""; // Fallback to an empty string or handle as needed

    // Verify OTP
    const storedOtp = await db.otp.findFirst({
      where: { phone: userPhone, otp },
    });
    if (!storedOtp || storedOtp.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "Invalid or expired OTP" },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUser = await db.user.findFirst({
      where: { email, phone: userPhone },
    });
    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user in the database
    const user = await db.user.create({
      data: {
        username: name,
        email,
        phone: userPhone, // Ensure this is always a string
        password: hashedPassword,
      },
    });

    // delete OTP
    await db.otp.deleteMany({ where: { phone } });

    return NextResponse.json(
      { message: "User created successfully", user },
      { status: 201 }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
