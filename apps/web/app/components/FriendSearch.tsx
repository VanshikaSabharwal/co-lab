"use client";
import Link from "next/link";
import React, { useState } from "react";
import { GrChat } from "react-icons/gr";

interface Friend {
  name: string;
  phone: string;
}

const FriendSearch = () => {
  const [phone, setPhone] = useState("");
  const [friend, setFriend] = useState<Friend | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    try {
      const response = await fetch("/api/friend-search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.message || "Something went wrong");
        setFriend(null);
        return;
      }
      const data = await response.json();
      if (response.ok) {
        setFriend(data);
        setError(null);
      } else {
        setFriend(null);
        setError(data.message);
      }
    } catch (err) {
      console.log("Error searching friend", err);
    }
  }

  return (
    <div className="w-full py-2 px-3 bg-white shadow-lg rounded-lg border border-gray-200">
      <h1 className="text-l sm:text-2xl font-bold mb-4 sm:mb-6 text-gray-800">
        Search for a Friend
      </h1>
      <form onSubmit={handleSearch} className="flex flex-col space-y-4">
        <input
          type="text"
          placeholder="Enter Friend's Phone Number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          className="w-full px-4 py-3 text-black border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <button
          type="submit"
          className="w-full py-3 px-4 bg-blue-500 hover:bg-blue-400 text-white font-semibold rounded-md transition duration-200 ease-in-out"
        >
          Search
        </button>
      </form>
      {error && (
        <p className="text-red-500 mt-4 text-sm sm:text-base">{error}</p>
      )}
      {friend && (
        <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg flex flex-col sm:flex-row items-center justify-between">
          <span className="text-gray-800 font-medium text-sm sm:text-base">
            {friend.name}
          </span>
          <Link
            href={`/chat/${friend.phone}`}
            className="mt-2 sm:mt-0 p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full transition duration-200 ease-in-out"
          >
            <GrChat className="w-6 h-6" />
          </Link>
        </div>
      )}
    </div>
  );
};

export default FriendSearch;
