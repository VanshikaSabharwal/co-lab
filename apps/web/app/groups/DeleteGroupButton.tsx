"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function DeleteGroupButton({
  groupId,
  ownerId,
  userId,
}: {
  groupId: string;
  ownerId: string;
  userId: string;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  if (ownerId !== userId) return null;

  const handleDelete = async () => {
    if (
      !confirm(
        "This will permanently delete the group, all messages, files, and member data. This action cannot be undone.",
      )
    )
      return;
    setDeleting(true);
    try {
      const res = await fetch("/api/create-group-data", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId, userId }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Failed to delete group");
        return;
      }
      toast.success("Group deleted");
      router.refresh();
    } catch {
      toast.error("An error occurred");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      className="text-xs text-red-500 hover:underline disabled:opacity-50"
    >
      {deleting ? "Deleting..." : "Delete"}
    </button>
  );
}
