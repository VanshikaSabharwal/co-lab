"use client";
import React, { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import Cookies from "js-cookie";

interface GuestData {
  guestId: string;
}

const GuestButton = () => {
  const [guestData, setGuestData] = useState<GuestData | null>(null);

  // Check if a guestId already exists in the cookies on mount
  useEffect(() => {
    const guestId = Cookies.get("guestId");
    if (guestId) {
      setGuestData({ guestId });
    }
  }, []);

  const handleGuestMode = () => {
    const newGuestId = uuidv4();
    Cookies.set("guestId", newGuestId, { expires: 2 }); // Set guestId cookie for 2 days
    setGuestData({ guestId: newGuestId });
    window.location.href = `/chat-room?guestId=${newGuestId}`;
  };

  return (
    <div className="flex flex-col items-center justify-center mt-2 space-y-4">
      {guestData ? (
        <div className="bg-gray-800 text-white p-2 rounded-lg shadow-lg max-w-md mx-auto">
          <p className="text-lg font-semibold">Guest Mode Active</p>
          <p className="text-sm mt-2">
            Your Guest ID:{" "}
            <span className="text-blue-400">{guestData.guestId}</span>
          </p>
          <p className="text-sm text-yellow-400 mt-2">
            Please note: Guest mode will expire in 2 days.
          </p>
        </div>
      ) : (
        <button
          onClick={handleGuestMode}
          className="bg-green-500 text-white font-semibold px-8 py-3 rounded-full shadow-lg hover:bg-green-600 transition duration-300 transform hover:scale-105"
        >
          Enter Guest Mode
        </button>
      )}
    </div>
  );
};

export default GuestButton;
