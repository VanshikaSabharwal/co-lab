import { NextRequest, NextResponse } from "next/server";
import db from "@repo/db/client";
import bcrypt from "bcrypt";
import { z } from "zod";

// Zod schema for validation
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
    .regex(/^\d+$/, "OTP must contain only digits")
    .optional(), // OTP is optional if phone is not provided
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = signupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors }, // Return detailed validation errors
        { status: 400 }
      );
    }

    const { name, email, phone, password, otp } = parsed.data;

    // Check if phone is provided if OTP is used
    if (otp && !phone) {
      return NextResponse.json(
        { error: "Phone number is required for OTP verification" },
        { status: 400 }
      );
    }

    // Verify OTP if provided
    if (otp && phone) {
      // Ensure phone is available before OTP check
      const storedOtp = await db.otp.findFirst({
        where: { phone, otp },
      });

      if (!storedOtp || storedOtp.expiresAt < new Date()) {
        return NextResponse.json(
          { error: "Invalid or expired OTP" },
          { status: 400 }
        );
      }
    }

    const existingUser = await db.user.findFirst({
      where: { email, phone: phone || "" },
      select: {
        id: true,
        email: true,
        username: true,
        phone: true,
      },
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
        phone: phone || "", // Ensure phone is an empty string if not provided
        password: hashedPassword,
      },
    });

    // Delete OTP if used
    if (otp) {
      await db.otp.deleteMany({ where: { phone } });
    }

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
