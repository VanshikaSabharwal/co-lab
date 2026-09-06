/**
 * The contract here is mostly about what must NOT happen: no base64, no image
 * bytes in React state, no size gating. The browser is handed a URL.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ImagePreview from "../../app/code-editor/[groupId]/[githubRepo]/ImagePreview";

describe("ImagePreview", () => {
  it("points the img straight at download_url", () => {
    const { container } = render(
      <ImagePreview name="a.png" size={80 * 1024 * 1024} downloadUrl="https://raw/a.png" saveUrl="/api/file-download?group=g1&path=a.png" />,
    );
    const img = container.querySelector("img")!;
    expect(img.getAttribute("src")).toBe("https://raw/a.png");
    // Never a data: URI — that would mean the bytes came through JS.
    expect(img.getAttribute("src")?.startsWith("data:")).toBe(false);
  });

  it("shows a skeleton until the image loads, then the image", async () => {
    const { container } = render(
      <ImagePreview name="a.png" size={1024} downloadUrl="https://raw/a.png" saveUrl="/api/file-download?group=g1&path=a.png" />,
    );
    expect(container.querySelector(".animate-pulse")).not.toBeNull();

    fireEvent.load(container.querySelector("img")!);

    await waitFor(() =>
      expect(container.querySelector(".animate-pulse")).toBeNull(),
    );
  });

  it("shows name and human-readable size", () => {
    render(
      <ImagePreview name="photo.jpg" size={80 * 1024 * 1024} downloadUrl="https://raw/p" saveUrl="/api/file-download?group=g1&path=p" />,
    );
    expect(screen.getByText("photo.jpg")).toBeDefined();
    expect(screen.getByText("80 MB")).toBeDefined();
  });

  it("offers retry and download when the image fails", async () => {
    const { container } = render(
      <ImagePreview name="a.png" size={1024} downloadUrl="https://raw/a.png" saveUrl="/api/file-download?group=g1&path=a.png" />,
    );

    fireEvent.error(container.querySelector("img")!);

    expect(await screen.findByText("Unable to preview this image.")).toBeDefined();
    expect(screen.getByRole("button", { name: /retry/i })).toBeDefined();
    expect(screen.getByText(/download/i)).toBeDefined();
  });

  it("re-requests the image on retry", async () => {
    const { container } = render(
      <ImagePreview name="a.png" size={1024} downloadUrl="https://raw/a.png" saveUrl="/api/file-download?group=g1&path=a.png" />,
    );
    fireEvent.error(container.querySelector("img")!);

    fireEvent.click(await screen.findByRole("button", { name: /retry/i }));

    // A fresh <img> is mounted so the browser retries rather than reusing its
    // cached failure.
    await waitFor(() => expect(container.querySelector("img")).not.toBeNull());
  });

  it("downloads through our own origin, not GitHub", () => {
    render(
      <ImagePreview
        name="a.png"
        size={1024}
        downloadUrl="https://raw.githubusercontent.com/o/r/main/a.png"
        saveUrl="/api/file-download?group=g1&path=a.png"
      />,
    );
    const link = screen.getByText("Download").closest("a")!;
    // A cross-origin href would make the browser navigate instead of saving,
    // which is the bug this replaced.
    expect(link.getAttribute("href")).toBe("/api/file-download?group=g1&path=a.png");
    expect(link.getAttribute("href")?.startsWith("http")).toBe(false);
  });

  it("reports an error when there is no URL to load", () => {
    render(<ImagePreview name="a.png" size={1024} downloadUrl={null} saveUrl="/api/file-download?group=g1&path=a.png" />);
    expect(screen.getByText("Unable to preview this image.")).toBeDefined();
  });
});
