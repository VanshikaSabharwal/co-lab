import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TrashPanel, {
  type TrashItem,
} from "../../app/code-editor/[groupId]/[githubRepo]/components/TrashPanel";

function item(over: Partial<TrashItem> = {}): TrashItem {
  return {
    id: 1,
    name: "notes.md",
    path: "docs/notes.md",
    stagedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 5 * 86400_000).toISOString(),
    daysLeft: 5,
    ...over,
  };
}

function renderPanel(items: TrashItem[], onRestore = vi.fn()) {
  render(
    <TrashPanel
      items={items}
      loading={false}
      ttlDays={10}
      restoringPath={null}
      onRestore={onRestore}
    />,
  );
  return onRestore;
}

describe("TrashPanel", () => {
  it("explains that staged files are still in the repo", () => {
    renderPanel([item()]);
    expect(screen.getByText(/still in the repo/i)).toBeDefined();
  });

  it("warns when something is inside its final day", () => {
    renderPanel([item({ daysLeft: 1, name: "old.ts" })]);
    expect(screen.getByText(/expires tomorrow/i)).toBeDefined();
    expect(screen.getByText("Expires in 1 day")).toBeDefined();
  });

  it("pluralises the warning for several expiring items", () => {
    renderPanel([
      item({ id: 1, daysLeft: 1, name: "a.ts", path: "a.ts" }),
      item({ id: 2, daysLeft: 0, name: "b.ts", path: "b.ts" }),
    ]);
    expect(screen.getByText(/2 staged deletions expire tomorrow/i)).toBeDefined();
  });

  it("stays quiet when nothing is close to expiring", () => {
    renderPanel([item({ daysLeft: 7 })]);
    expect(screen.queryByText(/expires tomorrow/i)).toBeNull();
  });

  it("restores by path", () => {
    const onRestore = renderPanel([item({ path: "docs/notes.md" })]);
    fireEvent.click(screen.getByRole("button", { name: /restore/i }));
    expect(onRestore).toHaveBeenCalledWith("docs/notes.md");
  });

  it("disables the button for the row being restored", () => {
    render(
      <TrashPanel
        items={[item({ path: "docs/notes.md" })]}
        loading={false}
        ttlDays={10}
        restoringPath="docs/notes.md"
        onRestore={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("button", { name: /restore/i }).hasAttribute("disabled"),
    ).toBe(true);
  });

  it("shows an empty state", () => {
    renderPanel([]);
    expect(screen.getByText(/nothing staged for deletion/i)).toBeDefined();
  });

  it("shows a loading state", () => {
    render(
      <TrashPanel
        items={[]}
        loading
        ttlDays={10}
        restoringPath={null}
        onRestore={vi.fn()}
      />,
    );
    expect(screen.getByText(/loading trash/i)).toBeDefined();
  });
});
