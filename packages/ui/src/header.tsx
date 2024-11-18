"use client";

import { User } from "next-auth";
import { Button } from "./button";
import { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import Cookies from "js-cookie";

interface AppbarProps {
  user: User | null;
  onSignin: () => void;
  onSignout: () => void;
}

interface GuestData {
  guestId: string;
}

export function Appbar({ user, onSignin, onSignout }: AppbarProps) {
  const [guestData, setGuestData] = useState<GuestData | null>(() => {
    const guestId = Cookies.get("guestId");
    return guestId ? { guestId } : null;
  });

  const handleGuestMode = () => {
    const newGuestId = uuidv4();
    Cookies.set("guestId", newGuestId, { expires: 2 });
    setGuestData({ guestId: newGuestId });
    window.location.href = `/chat-room?guestId=${newGuestId}`;
  };

  return (
    <div className="flex justify-between items-center px-4 sm:px-6 lg:px-8 py-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-purple-900 shadow-lg">
      <a
        href="/"
        className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600 hover:from-purple-400 hover:to-blue-600 transition-all duration-300"
      >
        Ko-lab
      </a>
      <div className="flex items-center space-x-2 sm:space-x-4">
        {guestData ? (
          <div className="bg-gray-800 text-white p-2 rounded-lg shadow-lg max-w-xs">
            <p className="text-sm font-semibold">Guest Mode Active</p>
            <p className="text-xs mt-1">
              ID:{" "}
              <span className="text-blue-400">
                {guestData.guestId.slice(0, 8)}...
              </span>
            </p>
            <p className="text-xs text-yellow-400 mt-1">Expires in 2 days</p>
          </div>
        ) : (
          <Button
            onClick={handleGuestMode}
            classname="bg-green-500 text-white text-sm font-semibold px-3 py-2 rounded-full shadow-md hover:bg-green-600 transition duration-300 transform hover:scale-105"
          >
            Guest Mode
          </Button>
        )}
        <Button
          onClick={user ? onSignout : onSignin}
          classname="bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-full shadow-md hover:bg-blue-600 transition duration-300 transform hover:scale-105"
        >
          {user ? "Logout" : "Login"}
        </Button>
      </div>
    </div>
  );
}
