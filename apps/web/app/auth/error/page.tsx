"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const errorMessages: Record<string, { title: string; description: string }> = {
  OAuthAccountNotLinked: {
    title: "Account already exists",
    description:
      "This email is already registered with a different sign-in provider. Please sign in using the original provider you used to create your account.",
  },
  OAuthSignin: {
    title: "OAuth sign-in failed",
    description: "An error occurred while starting the sign-in process. Please try again.",
  },
  OAuthCallback: {
    title: "OAuth callback error",
    description: "Something went wrong during sign-in. Please try again.",
  },
  Signin: {
    title: "Sign-in failed",
    description: "We were unable to sign you in. Please try again.",
  },
  default: {
    title: "Authentication error",
    description: "An unexpected error occurred. Please try again.",
  },
};

const AuthErrorContent = () => {
  const searchParams = useSearchParams();
  const error = searchParams.get("error") ?? "default";
  const { title, description } =
    errorMessages[error] ?? errorMessages["default"]!

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-7 text-center">
      <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
        <svg
          className="w-6 h-6 text-red-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z"
          />
        </svg>
      </div>

      <h1 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
        {title}
      </h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        {description}
      </p>

      <div className="space-y-2">
        <Link
          href="/auth/signin"
          className="block w-full py-2.5 text-sm font-semibold rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 text-white transition"
        >
          Back to sign in
        </Link>
        <Link
          href="/"
          className="block w-full py-2.5 text-sm font-semibold rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
        >
          Go to home
        </Link>
      </div>
    </div>
  );
};

const AuthErrorPage = () => {
  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4 py-10 bg-gray-50 dark:bg-gray-950">
      <div className="w-full max-w-sm">
        <Suspense fallback={null}>
          <AuthErrorContent />
        </Suspense>
      </div>
    </div>
  );
};

export default AuthErrorPage;
