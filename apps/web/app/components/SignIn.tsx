"use client";
import React, { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

const SignIn = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Show loading toast
    const toastId = toast.loading("Processing...");

    try {
      const result = await signIn("credentials", {
        redirect: false,
        name,
        email,
        phone,
        password,
      });

      if (result?.ok) {
        // Show success toast and redirect
        toast.success("Logged In Successfully");
        router.push("/chat-room");
      } else {
        // Show error toast
        toast.error(result?.error || "Login failed");
      }
    } catch (error) {
      // Handle unexpected errors
      toast.error("An unexpected error occurred");
    } finally {
      // Dismiss loading toast
      toast.dismiss(toastId);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-gray-100 rounded-lg shadow-md">
      <h1 className="text-3xl font-bold text-[#f32170] text-center mb-6">
        Sign In
      </h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <span className="text-gray-700">Name:</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#cf23cf] focus:border-[#cf23cf] sm:text-sm"
          />
        </label>
        <label className="block">
          <span className="text-gray-700">Email:</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#cf23cf] focus:border-[#cf23cf] sm:text-sm"
          />
        </label>
        <label className="block">
          <span className="text-gray-700">Phone:</span>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#cf23cf] focus:border-[#cf23cf] sm:text-sm"
          />
        </label>
        <label className="block">
          <span className="text-gray-700">Password:</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#cf23cf] focus:border-[#cf23cf] sm:text-sm"
          />
        </label>
        <button
          type="submit"
          className="w-full py-2 px-4 bg-[#cf23cf] text-white rounded-md shadow-sm hover:bg-[#e0b0ff] focus:outline-none focus:ring-2 focus:ring-[#f32170] focus:ring-offset-2"
        >
          Sign In
        </button>
        {error && <p className="text-red-500 text-center mt-4">{error}</p>}
      </form>
    </div>
  );
};

export default SignIn;
