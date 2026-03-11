"use client";

import React from "react";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { Code, MessageSquare, Users } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import Footer from "@repo/ui/footer";
import Cookies from "js-cookie";
import toast from "react-hot-toast";
import demoTestimonal from "../../../../data/demo-testimonial.json";

interface GuestData {
  guestId: string;
}

const HeroSection = () => {
  const { data: session } = useSession();
  const [guestData, setGuestData] = useState<GuestData | null>(null);
  const [testimonials, setTestimonials] = useState<
    { id: string; name: string; description: string; userId: string }[]
  >([]);
  const [inputName, setInputName] = useState("");
  const [inputDescription, setInputDescription] = useState("");
  const testimonialUserId = session?.user?.email || guestData?.guestId;
  const scrollRef = useRef<HTMLDivElement | null>(null);

useEffect(() => {
  const container = scrollRef.current;
  if (!container) return;

  let animationFrame: number;

  const scroll = () => {
    if (!container) return;

    container.scrollLeft += 0.5; // speed

    if (container.scrollLeft >= container.scrollWidth - container.clientWidth) {
      container.scrollLeft = 0; // loop
    }

    animationFrame = requestAnimationFrame(scroll);
  };

  animationFrame = requestAnimationFrame(scroll);

  return () => cancelAnimationFrame(animationFrame);
}, []);

  useEffect(() => {
    let guestId = Cookies.get("guestId");
    if (!guestId) {
      guestId = uuidv4();
      Cookies.set("guestId", guestId, { expires: 365 });
    }
    setGuestData({ guestId });
  }, []);

  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        const response = await fetch("/api/testimonial-card");
        let data: typeof demoTestimonal = [];

        if (response.ok) {
          const data = await response.json();
          // setTestimonials(data);  uncomment this when don't want to use demo testimonials -> only real testimonials will show on screen if uncommented fetched from DB
        }
        setTestimonials([...demoTestimonal, ...data]);
      } catch (err) {
        console.error("Failed to fetch testimonials:", err);
      }
    };
    fetchTestimonials();
  }, []);

  const handleAddTestimonial = async () => {
    try {
      const userId = session?.user?.email || guestData?.guestId;

      if (!userId) {
        toast.error("Could not determine user identity.");
        return;
      }
      const response = await fetch("/api/testimonial-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: inputName,
          description: inputDescription,
          userId,
        }),
      });
      if (response.ok) {
        const newTestimonial = await response.json();
        setTestimonials((prev) => [...prev, newTestimonial]);
        setInputName("");
        setInputDescription("");
        toast.success(
          "Your response has been added to the Testimonials section. Thanks for your feedback!",
        );
      } else {
        const errorData = await response.json();
        toast.error(`Error: ${errorData.error}`);
      }
    } catch (err) {
      console.error("Error adding testimonial: ", err);
      toast.error("Failed to add testimonial. Please try again.");
    }
  };
  const handleDeleteTestimonial = async (id: string) => {
    try {
      const userId = session?.user?.email || guestData?.guestId;
      // const canDelete = (id: string) =>
      //   testimonials.some(
      //     (t) => t.id === id && t.userId === session?.user?.email
      //   );

      const response = await fetch("/api/testimonial-card", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        setTestimonials((prev) =>
          prev.filter((testimonial) => testimonial.id !== id),
        );
        toast.success("Testimonial deleted successfully.");
      } else {
        const errorData = await response.json();
        toast.error(`Error: ${errorData.error}`);
      }
    } catch (err) {
      console.error("Error deleting testimonial:", err);
      toast.error("Failed to delete testimonial. Please try again.");
    }
  };

  return (
    <div className="bg-gradient-to-br from-gray-900 to-black">
      <div className="relative min-h-screen flex flex-col items-center justify-center text-white p-6 overflow-hidden">
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
            Unleash seamless collaboration with real-time coding, secure
            one-on-one and group chat—all in one platform.
          </p>

          {/* Buttons Container */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {/* Get Started or Chat Room Button */}
            {session || guestData ? (
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
              href="/github"
              className="px-8 py-4 bg-gray-800 text-white rounded-full text-lg font-semibold transition-all duration-300 shadow-lg hover:shadow-purple-500/20 hover:-translate-y-1 active:translate-y-0 active:shadow-lg border border-gray-700 hover:border-purple-400"
            >
              Create a Group
            </Link>

            {/* All Groups */}
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
          {/* Real-Time Code Editing Feature */}
          <div className="bg-gray-800 bg-opacity-50 p-6 rounded-lg backdrop-filter backdrop-blur-lg border border-gray-700 hover:border-blue-500 transition-all duration-300">
            <Code className="w-12 h-12 mx-auto mb-4 text-blue-400" />
            <h3 className="text-xl font-semibold mb-2">
              Real-Time Code Editing
            </h3>
            <p className="text-gray-300">
              Collaborate seamlessly with live code editing and syncing.
            </p>
          </div>
          {/* One-on-One Chat Feature */}
          <div className="bg-gray-800 bg-opacity-50 p-6 rounded-lg backdrop-filter backdrop-blur-lg border border-gray-700 hover:border-purple-500 transition-all duration-300">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 text-purple-400" />
            <h3 className="text-xl font-semibold mb-2">One-on-One Chat</h3>
            <p className="text-gray-300">
              Securely chat with team members to ensure smooth collaboration.
            </p>
          </div>
          {/* Group Chat for Projects Feature */}
          <div className="bg-gray-800 bg-opacity-50 p-6 rounded-lg backdrop-filter backdrop-blur-lg border border-gray-700 hover:border-indigo-500 transition-all duration-300">
            <Users className="w-12 h-12 mx-auto mb-4 text-indigo-400" />
            <h3 className="text-xl font-semibold mb-2">
              Group Chat for Projects
            </h3>
            <p className="text-gray-300">
              Collaborate with your team in dedicated project chat rooms.
            </p>
          </div>
        </motion.div>
      </div>

      {/* testimonials.  */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full"
      >
        <h1 className="text-4xl font-bold mb-6 text-center text-white pt-12">Testimonials</h1>
{/* Testimonials */}
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.8 }}
  className="mt-24 w-full px-6"
>

  <div
  ref={scrollRef}
  className="flex gap-6 overflow-x-auto pb-6 px-2 snap-x snap-mandatory scrollbar-hide"
  > 
    {testimonials.length > 0 ? (
      testimonials.map((testimonial) => (
        <div
          key={testimonial.id}
          className="flex-shrink-0 w-[85%] sm:w-[60%] md:w-[45%] lg:w-[30%] relative p-6 rounded-2xl bg-white/5 backdrop-blur-lg border border-white/10 shadow-lg hover:shadow-blue-500/20 hover:-translate-y-2 transition-all duration-300"
        >

          <p className="text-gray-300 leading-relaxed mt-4">
            {testimonial.description}
          </p>

          <div className="mt-6 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-400">
              — {testimonial.name}
            </span>

            {testimonialUserId === testimonial.userId && (
              <button
                onClick={() => handleDeleteTestimonial(testimonial.id)}
                className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded hover:bg-red-500/30 transition"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      ))
    ) : (
      <p className="text-gray-400 text-center col-span-full">
        No testimonials yet.
      </p>
    )}
  </div>
</motion.div>

<div className="mt-16 max-w-2xl mx-auto px-6 py-6">
  <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8 shadow-lg">
    
    <h3 className="text-2xl font-semibold mb-6 text-center bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
      Add Your Testimonial
    </h3>

    <div className="space-y-4">
      <input
        type="text"
        value={inputName}
        onChange={(e) => setInputName(e.target.value)}
        placeholder="Your Name"
        className="w-full px-4 py-3 rounded-lg bg-gray-900/70 border border-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
      />

      <textarea
        value={inputDescription}
        onChange={(e) => setInputDescription(e.target.value)}
        placeholder="Share your experience using Ko-Lab..."
        rows={4}
        className="w-full px-4 py-3 rounded-lg bg-gray-900/70 border border-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition resize-none"
      />

      <button
        onClick={handleAddTestimonial}
        className="w-full py-3 rounded-lg font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 transition-all shadow-lg hover:shadow-blue-500/30"
      >
        Submit Testimonial
      </button>
    </div>

  </div>
</div>
      </motion.div>
      <Footer />
    </div>
  )
}

export default HeroSection;
