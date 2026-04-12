"use client";

import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { FaGithub, FaGoogle } from "react-icons/fa";

const errorMessages: Record<string, string> = {
  OAuthAccountNotLinked:
    "This email is already registered with a different provider. Please sign in with the original provider you used.",
  OAuthSignin: "An error occurred while signing in with OAuth. Please try again.",
  OAuthCallback: "An error occurred during the OAuth callback. Please try again.",
  Signin: "Unable to sign in. Please try again.",
  default: "An unexpected error occurred. Please try again.",
};

const SignInPage = () => {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  const handleOAuth = async (provider: "github" | "google") => {
    setLoadingProvider(provider);
    await signIn(provider, { callbackUrl });
  };

  const errorMessage = error
    ? (errorMessages[error] ?? errorMessages.default)
    : null;

  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4 py-10 bg-gray-50 dark:bg-gray-950">
      <div className="w-full max-w-sm">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm p-7">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
            Sign in to Ko-Lab
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Choose a provider to continue
          </p>

          {errorMessage && (
            <div className="mb-5 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400">
              {errorMessage}
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={() => handleOAuth("github")}
              disabled={loadingProvider !== null}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 text-sm font-semibold rounded-lg bg-gray-900 hover:bg-gray-800 dark:bg-gray-800 dark:hover:bg-gray-700 text-white transition disabled:opacity-60"
            >
              <FaGithub className="w-4 h-4" />
              {loadingProvider === "github" ? "Redirecting..." : "Continue with GitHub"}
            </button>

            <button
              onClick={() => handleOAuth("google")}
              disabled={loadingProvider !== null}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 text-sm font-semibold rounded-lg bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-white border border-gray-200 dark:border-gray-700 transition disabled:opacity-60"
            >
              <FaGoogle className="w-4 h-4 text-red-500" />
              {loadingProvider === "google" ? "Redirecting..." : "Continue with Google"}
            </button>
          </div>

          <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-6">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-blue-500 hover:underline font-medium">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignInPage;
