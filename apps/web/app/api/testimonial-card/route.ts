import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const testimonials = await prisma.testimonial.findMany();
    return NextResponse.json(testimonials);
  } catch (error) {
    console.error("Error fetching testimonials:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function POST(req: Request) {
  try {
    const { name, description, userId } = await req.json();
    if (!name || !description) {
      return NextResponse.json(
        {
          error: "Name and description are required fields",
        },
        { status: 400 }
      );
    }

    const testimonialExist = await prisma.testimonial.findFirst({
      where: {
        name: name,
        description: description,
        userId,
      },
    });
    if (testimonialExist) {
      return NextResponse.json(
        {
          error: "Testimonials already exist",
        },
        { status: 409 }
      );
    }

    const testimonial = await prisma.testimonial.create({
      data: {
        name: name,
        description: description,
        userId,
      },
    });

    return NextResponse.json(testimonial, { status: 201 });
  } catch (err) {
    console.error("Error while creating Testimonial:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { userId } = await req.json();

    // Validate inputs
    if (!userId) {
      return NextResponse.json(
        { error: "ID and User ID are required" },
        { status: 400 }
      );
    }

    // Check if the testimonial exists and belongs to the user
    const testimonial = await prisma.testimonial.findUnique({
      where: { userId },
    });

    if (!testimonial) {
      return NextResponse.json(
        { error: "Testimonial not found" },
        { status: 404 }
      );
    }

    if (testimonial.userId !== userId) {
      return NextResponse.json(
        { error: "You are not authorized to delete this testimonial" },
        { status: 403 }
      );
    }

    // Delete the testimonial
    await prisma.testimonial.delete({
      where: { userId },
    });

    return NextResponse.json(
      { message: "Testimonial deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting testimonial:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
