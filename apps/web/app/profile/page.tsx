"use client";

import { useSession, signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { FaGithub, FaGoogle } from "react-icons/fa";
import { CheckCircle, User, Bell, BellOff } from "lucide-react";
import Image from "next/image";

type ProfileData = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  image: string | null;
  connectedProviders: string[];
};

export default function ProfilePage() {
  const { status } = useSession();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    if (typeof window === "undefined") return;
    setNotificationsEnabled(localStorage.getItem("notificationsEnabled") !== "false");
    if ("Notification" in window) setBrowserPermission(Notification.permission);
  }, []);

  const toggleNotifications = async (enabled: boolean) => {
    if (enabled && "Notification" in window && Notification.permission === "default") {
      const perm = await Notification.requestPermission();
      setBrowserPermission(perm);
      if (perm === "denied") return; // can't enable if browser denied
    }
    setNotificationsEnabled(enabled);
    localStorage.setItem("notificationsEnabled", String(enabled));
  };

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/profile")
      .then((r) => r.json())
      .then((data: ProfileData) => {
        setProfile(data);
        setName(data.name ?? "");
        setPhone(data.phone ?? "");
      });
  }, [status]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone }),
      });
      if (res.ok) {
        toast.success("Profile updated");
        setProfile((p) => p ? { ...p, name, phone } : p);
      } else {
        const d = await res.json();
        toast.error(d.error ?? "Failed to update profile");
      }
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (status === "loading" || (status === "authenticated" && !profile)) {
    return (
      <div className="min-h-[calc(100vh-56px)] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="min-h-[calc(100vh-56px)] flex flex-col items-center justify-center gap-3">
        <p className="text-sm text-gray-500 dark:text-gray-400">Sign in to view your profile.</p>
        <button
          onClick={() => signIn()}
          className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Sign in
        </button>
      </div>
    );
  }

  const isGithubConnected = profile!.connectedProviders.includes("github");
  const isGoogleConnected = profile!.connectedProviders.includes("google");

  return (
    <div className="min-h-[calc(100vh-56px)] bg-gray-50 dark:bg-gray-950 px-4 py-10">
      <div className="w-full max-w-lg mx-auto space-y-4">

        {/* Avatar + name */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 flex items-center gap-4">
          {profile!.image ? (
            <Image
              src={profile!.image}
              alt="Avatar"
              width={64}
              height={64}
              className="rounded-full object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <User className="w-8 h-8 text-gray-400" />
            </div>
          )}
          <div>
            <p className="font-semibold text-gray-900 dark:text-white text-lg">
              {profile!.name ?? "No name set"}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{profile!.email}</p>
          </div>
        </div>

        {/* Connected accounts */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Connected Accounts</h2>
          <div className="space-y-3">

            {/* GitHub */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FaGithub className="w-5 h-5 text-gray-900 dark:text-white" />
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">GitHub</span>
              </div>
              {isGithubConnected ? (
                <span className="flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-400">
                  <CheckCircle className="w-4 h-4" /> Connected
                </span>
              ) : (
                <button
                  onClick={() => signIn("github")}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:opacity-90 transition"
                >
                  Connect
                </button>
              )}
            </div>

            {/* Google */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FaGoogle className="w-4 h-4 text-red-500" />
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Google</span>
              </div>
              {isGoogleConnected ? (
                <span className="flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-400">
                  <CheckCircle className="w-4 h-4" /> Connected
                </span>
              ) : (
                <button
                  onClick={() => signIn("google")}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                >
                  Connect
                </button>
              )}
            </div>

          </div>
        </div>

        {/* Edit profile */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Profile Details</h2>
          <div className="space-y-3">

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Email</label>
              <input
                type="email"
                value={profile!.email}
                disabled
                className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-100 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Phone number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 234 567 8900"
                className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-2.5 text-sm font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg transition"
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Notifications</h2>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {notificationsEnabled && browserPermission === "granted" ? (
                <Bell className="w-4 h-4 text-blue-500" />
              ) : (
                <BellOff className="w-4 h-4 text-gray-400" />
              )}
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Browser notifications</p>
                {browserPermission === "denied" && (
                  <p className="text-xs text-red-500 mt-0.5">Blocked by browser — enable in browser settings</p>
                )}
                {browserPermission === "default" && (
                  <p className="text-xs text-gray-400 mt-0.5">Permission not yet granted</p>
                )}
              </div>
            </div>

            <button
              onClick={() => toggleNotifications(!notificationsEnabled)}
              disabled={browserPermission === "denied"}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                notificationsEnabled && browserPermission === "granted"
                  ? "bg-blue-600"
                  : "bg-gray-300 dark:bg-gray-600"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  notificationsEnabled && browserPermission === "granted" ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
