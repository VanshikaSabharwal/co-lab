import prisma from "../../lib/prisma";

export async function GET(req: Request) {
  // Parse the query parameters
  const { searchParams } = new URL(req.url);
  const group = searchParams.get("group");
  const userId = searchParams.get("userId");
  // Validate request parameters
  if (!group || !userId) {
    return new Response(
      JSON.stringify({ error: "Invalid request parameters." }),
      { status: 400 }
    );
  }

  try {
    // Check if the group exists and include its members
    const groupExists = await prisma.group.findUnique({
      where: { id: group },
      include: { members: true },
    });

    // If the group doesn't exist, return an error
    if (!groupExists) {
      return new Response(JSON.stringify({ error: "Group not found." }), {
        status: 404,
      });
    }

    // Check if the user is a member of the group
    const isMember = groupExists.members.some(
      (member) => member.userId === userId
    );

    // Return true or false based on membership
    return new Response(JSON.stringify({ exists: isMember }), { status: 200 });
  } catch (error) {
    console.error("Error checking group membership:", error);
    return new Response(JSON.stringify({ error: "Internal server error." }), {
      status: 500,
    });
  }
}
