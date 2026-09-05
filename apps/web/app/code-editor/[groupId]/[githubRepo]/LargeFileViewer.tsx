"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * Read-only viewer for files too large to put in CodeMirror.
 *
 * The whole point is that the file is never downloaded. GitHub honours HTTP
 * Range on raw content, so /api/file-chunk serves 256 KB slices and this
 * component asks only for the slices the viewport touches, plus one either
 * side. A 40 MB log costs a few hundred KB to scroll through.
 *
 * Byte offsets, not line numbers, are the addressing scheme: knowing that line
 * 900,000 starts at byte N requires reading the preceding bytes, which is
 * exactly the work being avoided. So the scrollbar maps to bytes, and line
 * numbers are shown relative to each loaded chunk.
 */

const CHUNK_SIZE = 256 * 1024;
/** Chunks kept in memory; beyond this the least-recently-used are dropped. */
const MAX_CACHED_CHUNKS = 24;
/** Rough bytes-per-line estimate, used only to size the scroll surface. */
const ASSUMED_LINE_BYTES = 80;
const ROW_HEIGHT = 20;

interface LargeFileViewerProps {
  groupId: string;
  filePath: string;
  fileRef?: string;
  size: number;
  name: string;
  downloadUrl: string | null;
}

interface Chunk {
  /** Byte offset of the first character of `text`. */
  start: number;
  end: number;
  lines: string[];
}

interface ChunkState {
  status: "loading" | "ready" | "error";
  chunk?: Chunk;
}

export default function LargeFileViewer({
  groupId,
  filePath,
  fileRef,
  size,
  name,
  downloadUrl,
}: LargeFileViewerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(600);

  // Bounded LRU of fetched chunks, keyed by chunk index. Kept in a ref because
  // fetches mutate it outside render; `version` forces a repaint when it
  // changes, so the cache itself never needs to be React state.
  const cacheRef = useRef<Map<number, ChunkState>>(new Map());
  const [version, setVersion] = useState(0);
  const bump = useCallback(() => setVersion((v) => v + 1), []);

  // In-flight requests, so rapid scrolling can't queue the same chunk twice.
  const inFlightRef = useRef<Map<number, AbortController>>(new Map());

  // Reset everything when the file changes — stale chunks belong to a
  // different document and would render as garbage.
  useEffect(() => {
    inFlightRef.current.forEach((c) => c.abort());
    inFlightRef.current.clear();
    cacheRef.current.clear();
    setScrollTop(0);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    bump();
  }, [groupId, filePath, fileRef, bump]);

  // Abort anything outstanding on unmount so responses can't land after the
  // component is gone.
  useEffect(() => {
    const inFlight = inFlightRef.current;
    return () => {
      inFlight.forEach((c) => c.abort());
      inFlight.clear();
    };
  }, []);

  const totalChunks = Math.max(1, Math.ceil(size / CHUNK_SIZE));
  // The scroll surface is an estimate: real line count is unknowable without
  // reading the file. It only has to be stable and monotonic in bytes.
  const estimatedLines = Math.max(1, Math.ceil(size / ASSUMED_LINE_BYTES));
  const totalHeight = estimatedLines * ROW_HEIGHT;

  const touch = useCallback((index: number, state: ChunkState) => {
    const cache = cacheRef.current;
    // Re-insert to mark most-recently-used (Map preserves insertion order).
    cache.delete(index);
    cache.set(index, state);
    if (cache.size > MAX_CACHED_CHUNKS) {
      for (const key of cache.keys()) {
        if (cache.size <= MAX_CACHED_CHUNKS) break;
        // Never evict something still being fetched.
        if (!inFlightRef.current.has(key)) cache.delete(key);
      }
    }
  }, []);

  const fetchChunk = useCallback(
    async (index: number) => {
      if (index < 0 || index >= totalChunks) return;
      const cache = cacheRef.current;
      const existing = cache.get(index);
      // Already loaded, or already being loaded — don't duplicate the request.
      if (existing?.status === "ready" || inFlightRef.current.has(index)) return;

      const controller = new AbortController();
      inFlightRef.current.set(index, controller);
      touch(index, { status: "loading" });
      bump();

      try {
        const res = await fetch("/api/file-chunk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            groupId,
            filePath,
            ref: fileRef,
            start: index * CHUNK_SIZE,
            length: CHUNK_SIZE,
          }),
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("chunk request failed");
        const data = await res.json();

        touch(index, {
          status: "ready",
          chunk: {
            start: data.start,
            end: data.end,
            lines: String(data.text ?? "").split("\n"),
          },
        });
      } catch (err) {
        // An abort is a scroll that moved on, not a failure worth showing.
        if ((err as Error)?.name !== "AbortError") {
          touch(index, { status: "error" });
        }
      } finally {
        inFlightRef.current.delete(index);
        bump();
      }
    },
    [groupId, filePath, fileRef, totalChunks, touch, bump],
  );

  // Which chunk the viewport is over, derived from scroll position as a
  // fraction of the byte range. A jump to the end requests only the last
  // chunk — nothing between is fetched.
  const firstVisibleLine = Math.floor(scrollTop / ROW_HEIGHT);
  const visibleLineCount = Math.ceil(viewportHeight / ROW_HEIGHT) + 2;
  const approxByte = Math.min(size - 1, firstVisibleLine * ASSUMED_LINE_BYTES);
  const activeChunk = Math.min(totalChunks - 1, Math.floor(approxByte / CHUNK_SIZE));

  // Fetch the visible chunk plus one either side, so scrolling in both
  // directions has content ready before it's needed.
  useEffect(() => {
    fetchChunk(activeChunk);
    fetchChunk(activeChunk + 1);
    fetchChunk(activeChunk - 1);
  }, [activeChunk, fetchChunk]);

  const state = cacheRef.current.get(activeChunk);
  const chunk = state?.chunk;

  // Rows for the current chunk. Only the visible slice is turned into DOM —
  // a chunk is a few thousand lines and only ~40 are ever on screen.
  const rows = useMemo(() => {
    if (!chunk) return [];
    // Where this chunk begins in the estimated line space, so its rows sit
    // under the scroll position that requested them.
    const chunkFirstLine = Math.floor(chunk.start / ASSUMED_LINE_BYTES);
    const offsetInChunk = Math.max(0, firstVisibleLine - chunkFirstLine);
    return chunk.lines
      .slice(offsetInChunk, offsetInChunk + visibleLineCount)
      .map((text, i) => ({
        key: chunkFirstLine + offsetInChunk + i,
        lineNo: offsetInChunk + i + 1,
        text,
      }));
    // `version` participates so a newly arrived chunk repaints.
  }, [chunk, firstVisibleLine, visibleLineCount, version]);

  const onScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const measure = () => setViewportHeight(el.clientHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const showSkeleton = !chunk && state?.status !== "error";
  const failed = state?.status === "error";

  return (
    <div className="flex h-full flex-col bg-[#282c34]">
      <div className="flex items-center justify-between gap-3 border-b border-gray-700 bg-gray-800 px-4 py-2 text-xs">
        <span className="truncate text-gray-300">
          {name} · {formatBytes(size)} · read-only, streamed in {formatBytes(CHUNK_SIZE)}{" "}
          chunks
        </span>
        {downloadUrl && (
          <a
            href={downloadUrl}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 rounded bg-gray-700 px-2 py-1 text-gray-100 hover:bg-gray-600"
          >
            Download
          </a>
        )}
      </div>

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="relative flex-1 overflow-auto font-mono text-[13px] leading-5"
      >
        {/* Spacer establishing the full scroll range without any real rows. */}
        <div style={{ height: totalHeight, position: "relative" }}>
          <div
            style={{
              position: "absolute",
              top: firstVisibleLine * ROW_HEIGHT,
              left: 0,
              right: 0,
            }}
          >
            {failed ? (
              <div className="flex flex-col items-start gap-2 p-4 text-xs text-red-300">
                <span>Couldn&apos;t load this part of the file.</span>
                <button
                  onClick={() => {
                    cacheRef.current.delete(activeChunk);
                    fetchChunk(activeChunk);
                  }}
                  className="rounded bg-gray-700 px-2 py-1 text-gray-100 hover:bg-gray-600"
                >
                  Retry
                </button>
              </div>
            ) : showSkeleton ? (
              // Placeholder rows while the chunk is in flight, so scrolling
              // shows structure rather than a blank panel.
              Array.from({ length: visibleLineCount }).map((_, i) => (
                <div key={i} className="flex h-5 items-center gap-3 px-4">
                  <span className="w-12 shrink-0" />
                  <span
                    className="h-2 animate-pulse rounded bg-gray-700"
                    style={{ width: `${30 + ((i * 17) % 50)}%` }}
                  />
                </div>
              ))
            ) : (
              rows.map((row) => (
                <div key={row.key} className="flex h-5 items-center gap-3 px-4">
                  <span className="w-12 shrink-0 select-none text-right text-gray-600">
                    {row.lineNo}
                  </span>
                  <span className="whitespace-pre text-gray-300">{row.text}</span>
                </div>
              ))
            )}
          </div>
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
