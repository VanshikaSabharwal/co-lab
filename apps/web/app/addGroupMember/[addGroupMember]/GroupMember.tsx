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
  const { data: session, status } = useSession(); // fetch session data
  const [backToGroup, setBackToGroup] = useState(false);

  const userId = session?.user.id;

  // Handler for phone number input
  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhoneNumber(e.target.value);
  };

  // Function to check if the user exists
  const checkUserExists = async () => {
    try {
      const response = await fetch(`/api/check-user?phone=${phoneNumber}`);
      const data = await response.json();
      setUserExists(data.exists);
      return data.exists;
    } catch (err) {
      console.error("Error checking user:", err);
    }
  };

  // Function to send invite if the user does not exist
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

  // Function to add existing user to the group
  const addGroupMember = async () => {
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
        alert(`Error: ${data.error} `);
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
      await addGroupMember();
    } else if (exists === false) {
      sendInvite();
    } else {
      alert("User does not exist in web app.");
    }
  };

  // Loading state while session is being fetched
  if (status === "loading") {
    return <div>Loading...</div>;
  }

  // If the user is not authenticated, redirect or show an unauthorized message
  if (status === "unauthenticated") {
    return <div>You are not authorized to view this page.</div>;
  }

  // Render content when session is authenticated
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

        {/* Display message based on whether user exists */}
        {userExists === false && (
          <div>
            <h1 className="mb-4 text-red-500">
              This phone number is not associated with any account. You can send
              an invite to create an account.
            </h1>
            <button onClick={sendInvite} type="button">
              Send Invite
            </button>
          </div>
        )}

        {userExists === true && (
          <div className="mb-4 text-green-500">
            User exists! You can add them to the group.
          </div>
        )}

        {/* Invite button appears only if the user does not exist */}
        {!userExists && (
          <button
            type="submit"
            className="w-full p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            {userExists === null ? "Check and Add Member" : "Send Invite"}
          </button>
        )}

        {/* Success message for invite */}
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
          <div>
            <Link href={`/group/${groupId}`}>Back to Group</Link>
          </div>
        )}
      </form>
    </div>
  );
};

export default AddGroupMember;
