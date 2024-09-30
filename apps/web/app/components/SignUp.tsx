"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Link from "next/link";
import { GrPowerCycle } from "react-icons/gr";

const SignUp = () => {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [userExist, setUserExist] = useState(false);

  // Send OTP to the user
  const handleSendOtp = async () => {
    const toastId = toast.loading("Sending OTP...");

    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, phone }),
      });

      if (response.ok) {
        setIsOtpSent(true);
        toast.success("OTP sent on Email");
      } else {
        const result = await response.json();
        toast.error(result.error || "Failed to send OTP");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred while sending OTP");
    } finally {
      toast.dismiss(toastId); // Dismiss the loading toast
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    // Show loading toast
    const toastId = toast.loading("Resending OTP...");

    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, phone }),
      });

      if (response.ok) {
        toast.success("OTP sent again!");
      } else {
        const result = await response.json();
        toast.error(result.error || "Failed to resend OTP");
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred while resending OTP");
    } finally {
      toast.dismiss(toastId); // Dismiss the loading toast
    }
  };

  // Final signup with OTP
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    // Show loading toast
    const toastId = toast.loading("Signing up...");

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, phone, password, otp }),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success("User Created Successfully. Please Login now");
        router.push("/api/auth/signin");
      } else {
        toast.error(result.error || "Signup failed");
        setUserExist(true);
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred during signup");
    } finally {
      toast.dismiss(toastId); // Dismiss the loading toast
    }
  };

  return (
    <form
      onSubmit={handleSignUp}
      className="max-w-lg mx-auto p-6 bg-white shadow-md rounded"
    >
      <h1 className="text-2xl font-bold mb-6 text-center">Sign Up</h1>

      {/* Name Field */}
      <div className="mb-4">
        <label
          htmlFor="name"
          className="block text-sm font-medium text-gray-700"
        >
          Name
        </label>
        <input
          type="text"
          id="name"
          placeholder="Enter your Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          required
        />
      </div>

      {/* Email Field */}
      <div className="mb-4">
        <label
          htmlFor="email"
          className="block text-sm font-medium text-gray-700"
        >
          Email
        </label>
        <input
          type="email"
          id="email"
          placeholder="Enter your Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          required
        />
      </div>

      {/* Phone Field */}
      <div className="mb-4">
        <label
          htmlFor="phone"
          className="block text-sm font-medium text-gray-700"
        >
          Phone Number
        </label>
        <input
          type="text"
          id="phone"
          placeholder="Enter your Phone Number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          required
        />
      </div>

      {/* Password Field */}
      <div className="mb-4">
        <label
          htmlFor="password"
          className="block text-sm font-medium text-gray-700"
        >
          Password
        </label>
        <input
          type="password"
          id="password"
          placeholder="Enter your Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          required
        />
      </div>

      {/* OTP Field (conditionally rendered) */}
      {isOtpSent && (
        <div className="mb-4 flex items-center space-x-2">
          <div className="flex-grow">
            <label
              htmlFor="otp"
              className="block text-sm font-medium text-gray-700"
            >
              OTP
            </label>
            <input
              type="text"
              id="otp"
              placeholder="Enter the OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>
          <button
            type="button"
            onClick={handleResendOtp}
            className="flex items-center justify-center p-2 bg-pink-600 text-white rounded-full hover:bg-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-500"
          >
            <GrPowerCycle className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Send OTP Button (if OTP not sent) */}
      {!isOtpSent && (
        <button
          type="button"
          onClick={handleSendOtp}
          className="w-full py-2 px-4 bg-indigo-600 text-white font-bold rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50"
        >
          Send OTP
        </button>
      )}

      {/* Submit Button */}
      {isOtpSent && (
        <button
          type="submit"
          className="w-full py-2 px-4 bg-pink-600 hover:bg-pink-500 text-white font-bold rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50"
        >
          Sign Up
        </button>
      )}

      {userExist && (
        <div className="mt-4">
          <Link
            href="/api/auth/signin"
            className="w-full py-2 px-4 bg-pink-600 hover:bg-pink-500 text-white font-bold rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50"
          >
            Login
          </Link>
        </div>
      )}
    </form>
  );
};

export default SignUp;
