"use client";
import Link from "next/link";
import React, { useState } from "react";
import { GrChat } from "react-icons/gr";
import { useSession } from "next-auth/react";

interface Friend {
  name: string;
  phone: string;
}

const FriendSearch = () => {
  // const { data: session } = useSession();
  const [friendNumber, setFriendNumber] = useState("");
  const [friend, setFriend] = useState<Friend | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  // Handle searching by friend's name
  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setFriend(null);

    try {
      //  First check if current user has phone number
      const phoneCheck = await fetch("/api/check-phone-number");
      const phoneData = await phoneCheck.json();

      if (!phoneCheck.ok || !phoneData.exists) {
        setShowPhoneModal(true); // prompt user to add phone
        setLoading(false);
        return;
      }

      //  If phone exists → continue to search friend
      const response = await fetch("/api/friend-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: friendNumber }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setError(errorData.message || "Something went wrong");
        setFriend(null);
        setLoading(false);
        return;
      }

      const data = await response.json();
      console.log("data",data)
      setFriend(data);
      setError(null);
    } catch (err) {
      console.log("Error searching friend", err);
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  // Handle phone submission
  async function handlePhoneSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const response = await fetch("/api/set-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      if (!response.ok) {
        const data = await response.json();
        setError(data.message || "Failed to update phone");
        return;
      }
      setShowPhoneModal(false);
      setError(null);
      alert("Phone number updated successfully!");
    } catch (err) {
      console.log("Error updating phone number", err);
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
          placeholder="Enter Friend's Number"
          value={friendNumber}
          onChange={(e) => setFriendNumber(e.target.value)}
          required
          className="w-full px-4 py-3 text-black border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <button
          type="submit"
          disabled={loading}
          className={`w-full py-3 px-4 font-semibold rounded-md transition duration-200 ease-in-out 
            ${loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-500 hover:bg-blue-400 text-white"}`}
        >
          {loading ? "Finding..." : "Search"}
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

      {/* Phone Modal */}
      {showPhoneModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-80">
            <h2 className="text-lg font-bold mb-4 text-gray-800">
              Please add your Phone Number to proceed.
            </h2>
            <form
              onSubmit={handlePhoneSubmit}
              className="flex flex-col space-y-3"
            >
              <input
                type="text"
                placeholder="Your phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="bg-blue-500 hover:bg-blue-400 text-white py-2 rounded-md font-semibold"
              >
                Submit
              </button>
              <button
                type="button"
                onClick={() => setShowPhoneModal(false)}
                className="mt-2 text-gray-500 hover:text-gray-700 underline"
              >
                Cancel
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FriendSearch;
