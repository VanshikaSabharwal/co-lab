"use client";

import { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import Cookies from "js-cookie";
import { signIn, signOut, useSession } from "next-auth/react";
import { Button } from "./button";

interface GuestData {
  guestId: string;
}

export function Appbar() {
  const { data: session, status } = useSession();

  return (
    <div className="flex justify-between items-center px-4 sm:px-6 lg:px-8 py-4 bg-gradient-to-r from-blue-900 via-indigo-900 to-purple-900 shadow-lg">
      <a
        href="/"
        className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600 hover:from-purple-400 hover:to-blue-600 transition-all duration-300"
      >
        Ko-lab
      </a>

      <div className="flex items-center space-x-2 sm:space-x-4">
        {status === "authenticated" ? (
          <Button
            onClick={() => signOut()}
            classname="bg-red-500 text-white text-sm font-semibold px-4 py-2 rounded-full shadow-md hover:bg-red-600 transition duration-300 transform hover:scale-105"
          >
            Logout
          </Button>
        ) : (
          <>
            <Button
              onClick={() => signIn("github")}
              classname="bg-gray-800 text-white text-sm font-semibold px-4 py-2 rounded-full shadow-md hover:bg-gray-900 transition duration-300 transform hover:scale-105"
            >
              Login with GitHub
            </Button>
            <Button
              onClick={() => signIn("google")}
              classname="bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-full shadow-md hover:bg-blue-600 transition duration-300 transform hover:scale-105"
            >
              Login with Google
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
