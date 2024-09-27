"use server";
import React from "react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "../lib/auth";

const HeroSection = async () => {
  const session = await getServerSession(authOptions);

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white p-6">
      {/* Main Heading */}
      <h1 className="text-5xl md:text-7xl font-extrabold mb-4 text-center leading-tight">
        CoLab: Code, Collaborate, and Chat—All in One Place!
      </h1>

      {/* Subtext */}
      <p className="text-lg md:text-xl font-light mb-8 text-center max-w-2xl text-gray-300">
        Empower your team to work smarter and faster. Share code, communicate
        seamlessly, and bring your projects to life—all in one collaborative
        platform.
      </p>

      {/* Get Started or Chat Room Button */}
      {session ? (
        <Link
          href="/chat-room"
          className="px-6 py-3 bg-pink-600 text-white rounded-lg text-lg hover:bg-pink-500 transition-all duration-300 shadow-lg"
        >
          Go to Chat Room
        </Link>
      ) : (
        <Link
          href="/signup"
          className="px-6 py-3 bg-pink-600 text-white rounded-lg text-lg hover:bg-pink-500 transition-all duration-300 shadow-lg"
        >
          Get Started
        </Link>
      )}

      {/* Make a Group Button */}
      <Link
        href="/create-group"
        className="mt-4 px-6 py-3 bg-indigo-600 text-white rounded-lg text-lg hover:bg-indigo-500 transition-all duration-300 shadow-lg"
      >
        Make a Group for Project Work
      </Link>

      {/* All groups*/}
      <Link
        href="/groups"
        className="mt-4 px-6 py-3 bg-indigo-600 text-white rounded-lg text-lg hover:bg-indigo-500 transition-all duration-300 shadow-lg"
      >
        All Groups
      </Link>
    </div>
  );
};

export default HeroSection;
