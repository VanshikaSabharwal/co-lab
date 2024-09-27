"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface AddGroupProps {
  groupId: string;
}

const AddGroupMember: React.FC<AddGroupProps> = ({ groupId }) => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [userExists, setUserExists] = useState<boolean | null>(null);
  const [inviteSent, setInviteSent] = useState(false);
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);
  const { data: session, status } = useSession();
  const [backToGroup, setBackToGroup] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhoneNumber(e.target.value);
  };

  const getUserId = async (): Promise<string | null> => {
    try {
      const res = await fetch(`/api/get-user-id?phone=${phoneNumber}`);
      const data = await res.json();

      if (data.exists && data.userId) {
        setUserId(data.userId);
        return data.userId;
      } else if (data.error) {
        alert(`Error: ${data.error}`);
        setBackToGroup(true);
      }
      return null;
    } catch (err) {
      console.error("Error getting user ID:", err);
      return null;
    }
  };

  const checkUserExists = async () => {
    try {
      const response = await fetch(`/api/check-user?phone=${phoneNumber}`);
      const data = await response.json();
      setUserExists(data.exists);
      return data.exists;
    } catch (err) {
      console.error("Error checking user:", err);
      return false;
    }
  };

  const sendInvite = async () => {
    try {
      const res = await fetch(`/api/send-invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId, phoneNumber }),
      });
      const data = await res.json();

      if (data.success) {
        setInviteSent(true);
        setWhatsappUrl(data.whatsappUrl);
      } else {
        console.error("Failed to send invite:", data.error);
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      console.error("Error sending invite:", err);
      alert("An error occurred while sending the invite.");
    }
  };

  const addGroupMember = async (userId: string) => {
    try {
      const res = await fetch(`/api/add-group-member`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, groupId }),
      });
      const data = await res.json();

      if (data.success) {
        alert("Member added successfully!");
        setBackToGroup(true);
      } else if (data.error) {
        alert(`Error: ${data.error}`);
        setBackToGroup(true);
      }
    } catch (err) {
      console.error("Error adding group member:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const exists = await checkUserExists();
    if (exists === true) {
      const userId = await getUserId();
      if (userId) {
        await addGroupMember(userId);
      } else {
        alert("Failed to get user ID.");
      }
    } else if (exists === false) {
      await sendInvite();
    } else {
      alert("Failed to check if user exists.");
    }
  };

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  if (status === "unauthenticated") {
    return <div>You are not authorized to view this page.</div>;
  }

  return (
    <div className="max-w-lg mx-auto mt-10 p-6 bg-white shadow-md rounded-lg">
      <h1 className="text-xl font-semibold text-center mb-6">
        Add Group Member
      </h1>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label
            htmlFor="phoneNumber"
            className="block text-gray-700 font-medium"
          >
            Enter Phone Number:
          </label>
          <input
            type="tel"
            id="phoneNumber"
            value={phoneNumber}
            onChange={handlePhoneNumberChange}
            className="w-full mt-2 p-2 border border-gray-300 rounded-lg"
            placeholder="Enter phone number"
            required
          />
        </div>

        {userExists === false && (
          <div>
            <h1 className="mb-4 text-red-500">
              This phone number is not associated with any account. You can send
              an invite to create an account.
            </h1>
            <button
              onClick={sendInvite}
              type="button"
              className="w-full p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Send Invite
            </button>
          </div>
        )}

        {userExists === true && (
          <div className="mb-4 text-green-500">
            User exists! You can add them to the group.
          </div>
        )}

        {userExists === null && (
          <button
            type="submit"
            className="w-full p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Check and Add Member
          </button>
        )}

        {inviteSent && whatsappUrl && (
          <div className="mt-4 text-green-500">
            Send Invite to {phoneNumber}. The user can join after registering.
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 underline"
            >
              Send invite via WhatsApp
            </a>
          </div>
        )}
        {backToGroup && (
          <div className="mt-4">
            <Link
              href={`/group/${groupId}`}
              className="text-blue-500 underline"
            >
              Back to Group
            </Link>
          </div>
        )}
      </form>
    </div>
  );
};

export default AddGroupMember;
