"use client";
import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface NotificationsType {
  id: string;
  userId: string;
  groupId: string;
  userName: string;
  ownerId: string;
  ownerName: string;
  groupName: string;
}

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState<NotificationsType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { data: session } = useSession();
  const userId = session?.user.id;

  useEffect(() => {
    const fetchNotifications = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/notifications?userId=${userId}`);
        const data = await response.json();

        if (data.success) {
          setNotifications(data.notifications);
        } else {
          setError(data.error);
        }
      } catch (error) {
        console.error("Error fetching notifications:", error);
        setError("Failed to fetch notifications.");
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [userId]);

  if (loading) {
    return (
      <div className="text-center text-gray-500">Loading notifications...</div>
    );
  }

  if (error) {
    return <div className="text-center text-red-500">{error}</div>;
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">All Notifications</h1>
      <ul className="space-y-2">
        {notifications.map((notification) => (
          <li key={notification.id} className="p-4 border rounded-md shadow">
            <p className="text-lg">
              {notification.userName} raised a CR in{" "}
              <strong>{notification.groupName}</strong>
            </p>
            <Link
              href={`/confirm-changes/${notification.groupId}`}
              className="mt-2 inline-block text-blue-500 hover:underline"
            >
              View Changes
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default NotificationsPage;
