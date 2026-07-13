"use client";

import React, { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { toPng } from "html-to-image";
import toast from "react-hot-toast";
import { Bug, X, Camera, Pencil, Trash2 } from "lucide-react";

type Category = "BUG" | "UI" | "PERFORMANCE" | "OTHER";
type Severity = "LOW" | "MEDIUM" | "HIGH";

// Keep a rolling buffer of recent runtime errors to attach as context.
const recentErrors: string[] = [];
function pushError(msg: string) {
  recentErrors.push(`${new Date().toISOString().slice(11, 19)} ${msg}`);
  if (recentErrors.length > 10) recentErrors.shift();
}

export default function BugReportButton() {
  const { status } = useSession();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category>("BUG");
  const [severity, setSeverity] = useState<Severity>("MEDIUM");
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [drawing, setDrawing] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDown = useRef(false);

  // Capture global errors from app start (this button is mounted globally).
  useEffect(() => {
    const onError = (e: ErrorEvent) => pushError(`Error: ${e.message}`);
    const onRejection = (e: PromiseRejectionEvent) =>
      pushError(`Unhandled: ${String(e.reason).slice(0, 200)}`);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  const reset = () => {
    setTitle("");
    setDescription("");
    setCategory("BUG");
    setSeverity("MEDIUM");
    setScreenshot(null);
  };

  const captureScreenshot = async () => {
    setCapturing(true);
    setOpen(false); // hide the modal so it isn't in the shot
    try {
      // Wait a tick for the modal to disappear before snapshotting
      await new Promise((r) => setTimeout(r, 150));
      const dataUrl = await toPng(document.body, {
        cacheBust: true,
        // Downscale big screens to keep the payload reasonable
        pixelRatio: Math.min(window.devicePixelRatio, 1),
      });
      setScreenshot(dataUrl);
    } catch (err) {
      console.error(err);
      toast.error("Couldn't capture the screen");
    } finally {
      setCapturing(false);
      setOpen(true);
    }
  };

  // Draw the screenshot onto the canvas whenever it changes
  useEffect(() => {
    if (!screenshot || !open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const img = new Image();
    img.onload = () => {
      const maxW = 520;
      const scale = Math.min(1, maxW / img.width);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = screenshot;
  }, [screenshot, open]);

  // All hooks are declared above — safe to bail out for signed-out users now.
  if (status !== "authenticated") return null;

  const pointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing) return;
    isDown.current = true;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = pointer(e);
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x, y);
  };
  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDown.current || !drawing) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = pointer(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };
  const onUp = () => (isDown.current = false);

  const submit = async () => {
    if (!title.trim() || !description.trim()) {
      toast.error("Add a title and a description");
      return;
    }
    setSubmitting(true);
    try {
      // If annotated, export the canvas (screenshot + drawings); else raw shot
      const finalShot = canvasRef.current
        ? canvasRef.current.toDataURL("image/png")
        : screenshot;

      const res = await fetch("/api/bug-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          category,
          severity,
          url: window.location.href,
          userAgent: navigator.userAgent,
          context: {
            errors: recentErrors.slice(-10),
            viewport: `${window.innerWidth}x${window.innerHeight}`,
          },
          screenshot: screenshot ? finalShot : null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Thanks! Your bug report was submitted.");
        setOpen(false);
        reset();
      } else {
        toast.error(data.error ?? "Failed to submit");
      }
    } catch {
      toast.error("Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  const chip = (active: boolean) =>
    `px-2.5 py-1 rounded-full text-xs font-medium border transition ${
      active
        ? "bg-blue-600 border-blue-600 text-white"
        : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-blue-400"
    }`;

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          title="Report a bug"
          className="fixed bottom-5 right-5 z-[90] flex items-center gap-2 rounded-full bg-gray-900 dark:bg-white px-4 py-2.5 text-sm font-medium text-white dark:text-gray-900 shadow-lg transition hover:scale-105"
        >
          <Bug className="h-4 w-4" />
          Report a bug
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl dark:bg-gray-900">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
                <Bug className="h-4 w-4" /> Report a bug
              </h2>
              <button onClick={() => setOpen(false)} className="rounded-full p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
                <X className="h-5 w-5" />
              </button>
            </div>

            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Short summary of the bug"
              className="mb-2 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What happened? What did you expect? Steps to reproduce…"
              rows={4}
              className="mb-3 w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />

            <div className="mb-2 flex flex-wrap gap-1.5">
              {(["BUG", "UI", "PERFORMANCE", "OTHER"] as Category[]).map((c) => (
                <button key={c} onClick={() => setCategory(c)} className={chip(category === c)}>
                  {c === "PERFORMANCE" ? "Perf" : c[0] + c.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
            <div className="mb-3 flex items-center gap-2">
              <span className="text-xs text-gray-500">Severity:</span>
              {(["LOW", "MEDIUM", "HIGH"] as Severity[]).map((s) => (
                <button key={s} onClick={() => setSeverity(s)} className={chip(severity === s)}>
                  {s[0] + s.slice(1).toLowerCase()}
                </button>
              ))}
            </div>

            {/* Screenshot */}
            {screenshot ? (
              <div className="mb-3">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500">Screenshot</span>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setDrawing((d) => !d)}
                      className={`flex items-center gap-1 rounded px-2 py-0.5 text-[11px] ${drawing ? "bg-red-500 text-white" : "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200"}`}
                    >
                      <Pencil className="h-3 w-3" /> Draw
                    </button>
                    <button
                      onClick={() => setScreenshot(null)}
                      className="flex items-center gap-1 rounded bg-gray-200 px-2 py-0.5 text-[11px] text-gray-700 dark:bg-gray-700 dark:text-gray-200"
                    >
                      <Trash2 className="h-3 w-3" /> Remove
                    </button>
                  </div>
                </div>
                <canvas
                  ref={canvasRef}
                  onPointerDown={onDown}
                  onPointerMove={onMove}
                  onPointerUp={onUp}
                  onPointerLeave={onUp}
                  className={`w-full rounded-lg border border-gray-200 dark:border-gray-700 ${drawing ? "cursor-crosshair" : ""}`}
                />
                <p className="mt-1 text-[11px] text-gray-400">Drag on the image to highlight the problem area.</p>
              </div>
            ) : (
              <button
                onClick={captureScreenshot}
                disabled={capturing}
                className="mb-3 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 py-2.5 text-sm text-gray-600 transition hover:border-blue-400 hover:text-blue-500 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300"
              >
                <Camera className="h-4 w-4" />
                {capturing ? "Capturing…" : "Attach a screenshot of this page"}
              </button>
            )}

            <p className="mb-3 text-[11px] text-gray-400">
              We also attach the page URL, your browser, and any recent errors to help us fix it faster.
            </p>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={submitting}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? "Submitting…" : "Submit report"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
