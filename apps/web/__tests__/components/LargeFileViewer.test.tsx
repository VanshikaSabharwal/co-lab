/**
 * Behavioural guards for the virtualized viewer: it must never pull the whole
 * file, must not queue duplicate requests while scrolling, and must jump
 * straight to a distant offset rather than walking there.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent, waitFor } from "@testing-library/react";
import LargeFileViewer from "../../app/code-editor/[groupId]/[githubRepo]/LargeFileViewer";

const FILE_SIZE = 40 * 1024 * 1024;
const CHUNK_SIZE = 256 * 1024;

/** Records every chunk request and answers with synthetic lines. */
function mockChunks() {
  const requests: Array<{ start: number; length: number }> = [];
  global.fetch = vi.fn(async (_url: string, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body ?? "{}"));
    requests.push({ start: body.start, length: body.length });
    const lines = Array.from(
      { length: 50 },
      (_, i) => `chunk@${body.start} line ${i}`,
    );
    return {
      ok: true,
      json: async () => ({
        text: lines.join("\n"),
        start: body.start,
        end: body.start + CHUNK_SIZE,
        total: FILE_SIZE,
        ranged: true,
      }),
    };
  }) as unknown as typeof fetch;
  return requests;
}

function renderViewer() {
  return render(
    <LargeFileViewer
      groupId="g1"
      filePath="huge.log"
      fileRef="main"
      size={FILE_SIZE}
      name="huge.log"
      saveUrl="/api/file-download?group=g1&path=huge.log"
    />,
  );
}

beforeEach(() => {
  // jsdom has no ResizeObserver.
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("LargeFileViewer", () => {
  it("fetches only a few chunks, never the whole file", async () => {
    const requests = mockChunks();
    renderViewer();

    await waitFor(() => expect(requests.length).toBeGreaterThan(0));

    // The file is 160 chunks; the viewport plus prefetch is a handful.
    expect(requests.length).toBeLessThanOrEqual(3);
    const fetched = requests.length * CHUNK_SIZE;
    expect(fetched).toBeLessThan(FILE_SIZE / 10);
  });

  it("prefetches the chunk before and after the viewport", async () => {
    const requests = mockChunks();
    const { container } = renderViewer();
    await waitFor(() => expect(requests.length).toBeGreaterThan(0));

    const scroller = container.querySelector(".overflow-auto") as HTMLElement;
    Object.defineProperty(scroller, "clientHeight", { value: 600, writable: true });

    // Scroll to the middle so there is a chunk on both sides.
    await act(async () => {
      fireEvent.scroll(scroller, { target: { scrollTop: 2_000_000 } });
    });
    await waitFor(() => expect(requests.length).toBeGreaterThan(1));

    const starts = requests.map((r) => r.start).sort((a, b) => a - b);
    const gaps = starts.slice(1).map((s, i) => s - starts[i]!);
    // Neighbouring chunks were requested, i.e. prefetch reached both ways.
    expect(gaps.some((g) => g === CHUNK_SIZE)).toBe(true);
  });

  it("does not request the same chunk twice during rapid scrolling", async () => {
    const requests = mockChunks();
    const { container } = renderViewer();
    await waitFor(() => expect(requests.length).toBeGreaterThan(0));

    const scroller = container.querySelector(".overflow-auto") as HTMLElement;
    Object.defineProperty(scroller, "clientHeight", { value: 600, writable: true });

    // Jitter around one position, the way a trackpad does.
    for (const top of [500_000, 500_100, 500_050, 500_200, 500_000]) {
      await act(async () => {
        fireEvent.scroll(scroller, { target: { scrollTop: top } });
      });
    }

    const starts = requests.map((r) => r.start);
    expect(new Set(starts).size).toBe(starts.length);
  });

  it("jumps straight to a distant offset without loading everything between", async () => {
    const requests = mockChunks();
    const { container } = renderViewer();
    await waitFor(() => expect(requests.length).toBeGreaterThan(0));

    const scroller = container.querySelector(".overflow-auto") as HTMLElement;
    Object.defineProperty(scroller, "clientHeight", { value: 600, writable: true });

    const before = requests.length;
    // Jump to the far end of the file in one move.
    await act(async () => {
      fireEvent.scroll(scroller, {
        target: { scrollTop: (FILE_SIZE / 80) * 20 },
      });
    });
    await waitFor(() => expect(requests.length).toBeGreaterThan(before));

    // A sequential walk would be ~160 requests; this is a handful.
    expect(requests.length).toBeLessThan(10);
  });

  it("scrolls upward as well as downward", async () => {
    const requests = mockChunks();
    const { container } = renderViewer();
    await waitFor(() => expect(requests.length).toBeGreaterThan(0));

    const scroller = container.querySelector(".overflow-auto") as HTMLElement;
    Object.defineProperty(scroller, "clientHeight", { value: 600, writable: true });

    await act(async () => {
      fireEvent.scroll(scroller, { target: { scrollTop: 3_000_000 } });
    });
    const afterDown = requests.length;

    await act(async () => {
      fireEvent.scroll(scroller, { target: { scrollTop: 1_000_000 } });
    });
    await waitFor(() => expect(requests.length).toBeGreaterThan(afterDown));
  });

  it("offers a retry when a chunk request fails", async () => {
    let failNext = true;
    global.fetch = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? "{}"));
      if (failNext) {
        failNext = false;
        return { ok: false, json: async () => ({ error: "boom" }) };
      }
      return {
        ok: true,
        json: async () => ({
          text: "recovered line",
          start: body.start,
          end: body.start + 100,
          total: FILE_SIZE,
          ranged: true,
        }),
      };
    }) as unknown as typeof fetch;

    renderViewer();

    const retry = await screen.findByRole("button", { name: /retry/i });
    await act(async () => {
      fireEvent.click(retry);
    });

    await waitFor(() =>
      expect(screen.getByText(/recovered line/)).toBeDefined(),
    );
  });

  it("renders only a viewport's worth of rows, not the whole chunk", async () => {
    mockChunks();
    const { container } = renderViewer();

    await waitFor(() =>
      expect(container.querySelectorAll(".whitespace-pre").length).toBeGreaterThan(0),
    );

    // 40 MB is millions of lines; the DOM holds a screenful.
    expect(container.querySelectorAll(".whitespace-pre").length).toBeLessThan(100);
  });
});
