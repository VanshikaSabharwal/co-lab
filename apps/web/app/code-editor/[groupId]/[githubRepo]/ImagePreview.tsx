"use client";

import { useEffect, useState } from "react";

/**
 * Shows an image file by pointing the browser at GitHub's download_url.
 *
 * Deliberately no base64, no React state holding pixels, and no size tiers: an
 * 80 MB PNG is the browser's problem to stream and decode, which it does far
 * better than any amount of JavaScript. Only the URL crosses into React.
 */
interface ImagePreviewProps {
  name: string;
  size: number;
  /** GitHub's raw URL — used for display only, since <img> is fine cross-origin. */
  downloadUrl: string | null;
  /** Same-origin attachment URL; a cross-origin `download` attribute is ignored. */
  saveUrl: string;
}

export default function ImagePreview({
  name,
  size,
  downloadUrl,
  saveUrl,
}: ImagePreviewProps) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    downloadUrl ? "loading" : "error",
  );
  // Bumped to re-request the same URL on Retry — without a changing key the
  // browser reuses its cached failure and onError never fires again.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setStatus(downloadUrl ? "loading" : "error");
  }, [downloadUrl, name]);

  return (
    <div className="flex h-full items-center justify-center overflow-auto p-8">
      <div className="flex max-w-full flex-col items-center gap-3 text-center">
        {status === "loading" && (
          <div className="h-64 w-96 max-w-full animate-pulse rounded-lg bg-gray-800" />
        )}

        {status === "error" ? (
          <>
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gray-800 text-2xl">
              🖼️
            </div>
            <p className="text-sm text-gray-300">Unable to preview this image.</p>
          </>
        ) : (
          downloadUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={attempt}
              src={downloadUrl}
              alt={name}
              onLoad={() => setStatus("ready")}
              onError={() => setStatus("error")}
              className={`max-h-[60vh] max-w-full rounded-lg border border-gray-700 object-contain ${
                status === "loading" ? "hidden" : ""
              }`}
            />
          )
        )}

        <p className="text-sm font-medium text-gray-200">{name}</p>
        <p className="text-xs text-gray-500">{formatBytes(size)}</p>

        <div className="flex items-center gap-2">
          {status === "error" && downloadUrl && (
            <button
              onClick={() => {
                setStatus("loading");
                setAttempt((a) => a + 1);
              }}
              className="rounded-md bg-gray-700 px-3 py-1.5 text-xs font-medium text-gray-100 transition hover:bg-gray-600"
            >
              Retry
            </button>
          )}
          {status === "ready" && downloadUrl && (
            <a
              href={downloadUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-md bg-gray-700 px-3 py-1.5 text-xs font-medium text-gray-100 transition hover:bg-gray-600"
            >
              Open full image
            </a>
          )}
          {/* Same-origin, so Content-Disposition actually saves the file.
              Pointing this at GitHub made the browser navigate instead. */}
          <a
            href={saveUrl}
            className="rounded-md bg-gray-700 px-3 py-1.5 text-xs font-medium text-gray-100 transition hover:bg-gray-600"
          >
            Download
          </a>
        </div>
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
}
