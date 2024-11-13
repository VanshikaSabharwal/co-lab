"use client";

import React from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Code, MessageSquare, Briefcase } from "lucide-react";
import Footer from "@repo/ui/footer";

const HeroSection = () => {
  const { data: session } = useSession();

  return (
    <div>
      <div className="relative min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-black text-white p-6 overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-10 left-10 w-20 h-20 bg-blue-600 rounded-full mix-blend-overlay filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute top-0 right-0 w-72 h-72 bg-purple-600 rounded-full mix-blend-overlay filter blur-xl opacity-10 animate-pulse animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-indigo-600 rounded-full mix-blend-overlay filter blur-xl opacity-20 animate-pulse animation-delay-4000"></div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="z-10 max-w-5xl mx-auto text-center"
        >
          {/* Main Heading */}
          <h1 className="text-5xl md:text-7xl font-extrabold mb-6 text-center leading-tight">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
              Ko-Lab:
            </span>{" "}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-300">
              Code, Collaborate, and Chat
            </span>
          </h1>

          {/* Subtext */}
          <p className="text-lg md:text-xl font-light mb-10 text-center max-w-2xl mx-auto text-gray-300">
            Elevate your team's efficiency with our professional, secure, and
            innovative collaborative platform. Experience seamless coding and
            communication in one place.
          </p>

          {/* Buttons Container */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {/* Get Started or Chat Room Button */}
            {session ? (
              <Link
                href="/chat-room"
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-full text-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-blue-500/30 hover:-translate-y-1 active:translate-y-0 active:shadow-lg"
              >
                Go to Chat Room
              </Link>
            ) : (
              <Link
                href="/signup"
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-full text-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-blue-500/30 hover:-translate-y-1 active:translate-y-0 active:shadow-lg"
              >
                Get Started
              </Link>
            )}

            {/* Make a Group Button */}
            <Link
              href="/create-group"
              className="px-8 py-4 bg-gray-800 text-white rounded-full text-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-purple-500/20 hover:-translate-y-1 active:translate-y-0 active:shadow-lg border border-gray-700 hover:border-purple-400"
            >
              Create a Group
            </Link>

            {/* All groups */}
            <Link
              href="/groups"
              className="px-8 py-4 bg-gray-900 text-white rounded-full text-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-indigo-500/20 hover:-translate-y-1 active:translate-y-0 active:shadow-lg border border-gray-800 hover:border-indigo-400"
            >
              My Groups
            </Link>
          </div>
        </motion.div>

        {/* Feature highlights */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto text-center z-10"
        >
          <div className="bg-gray-800 bg-opacity-50 p-6 rounded-lg backdrop-filter backdrop-blur-lg border border-gray-700 hover:border-blue-500 transition-all duration-300">
            <Code className="w-12 h-12 mx-auto mb-4 text-blue-400" />
            <h3 className="text-xl font-semibold mb-2">Efficient Coding</h3>
            <p className="text-gray-300">
              Collaborate in real-time with advanced code syncing
            </p>
          </div>
          <div className="bg-gray-800 bg-opacity-50 p-6 rounded-lg backdrop-filter backdrop-blur-lg border border-gray-700 hover:border-purple-500 transition-all duration-300">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 text-purple-400" />
            <h3 className="text-xl font-semibold mb-2">Secure Communication</h3>
            <p className="text-gray-300">
              End-to-end encrypted chat for your team's privacy
            </p>
          </div>
          <div className="bg-gray-800 bg-opacity-50 p-6 rounded-lg backdrop-filter backdrop-blur-lg border border-gray-700 hover:border-indigo-500 transition-all duration-300">
            <Briefcase className="w-12 h-12 mx-auto mb-4 text-indigo-400" />
            <h3 className="text-xl font-semibold mb-2">
              Professional Management
            </h3>
            <p className="text-gray-300">
              Streamlined project tracking and task organization
            </p>
          </div>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
};

export default HeroSection;
