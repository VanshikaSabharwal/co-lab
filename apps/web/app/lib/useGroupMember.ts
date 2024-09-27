"use client";
import { useEffect, useState } from "react";

interface UserDetails {
  username: string;
  phone: string;
}

interface GroupMember {
  id: string;
  userId: string;
  role: string; // Adjust based on your GroupRole type if needed
  user: UserDetails;
}

const useGroupMembers = (groupId: string) => {
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const response = await fetch(`/api/members?groupId=${groupId}`);
        if (!response.ok) throw new Error("Failed to fetch members");
        const data = await response.json();
        setMembers(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [groupId]);

  return { members, loading, error };
};

export default useGroupMembers;
