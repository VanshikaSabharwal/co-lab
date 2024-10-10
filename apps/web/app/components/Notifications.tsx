import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

const Notifications = () => {
  const [notificationCount, setNotificationCount] = useState(0);
  const { data: session } = useSession();
  const userId = session?.user.id;

  useEffect(() => {
    const fetchNotificationCount = async () => {
      try {
        const response = await fetch(`/api/notifications?userId=${userId}`);
        const data = await response.json();

        if (data.success) {
          setNotificationCount(data.notifications.length);
        }
      } catch (error) {
        console.error("Error fetching notifications:", error);
      }
    };

    if (userId) {
      fetchNotificationCount();
    }
  }, [userId]);

  // Remove the notification count once the user clicks the link (simulating view)
  const handleViewNotifications = () => {
    setNotificationCount(0); // Reset the count
  };

  return (
    <div className="relative flex items-center space-x-4">
      <Link
        href="/notifications"
        className="text-gray-700 hover:text-blue-600 font-semibold text-lg transition-colors duration-200 hover:scale-105"
        onClick={handleViewNotifications} // Remove count after viewing
      >
        Notifications
        {notificationCount > 0 && (
          <span className="absolute -top-2 -right-3 bg-red-600 text-white text-sm font-bold px-2 py-1 rounded-full flex items-center justify-center w-6 h-6">
            {notificationCount}
          </span>
        )}
      </Link>
    </div>
  );
};

export default Notifications;
