import { fireEvent, render, screen } from "@testing-library/react";

import { OPEN_SHORTCUT_HELP_EVENT, ShortcutHelpButton } from "@/components/ShortcutHelpButton";
import { ShortcutHelpModal } from "@/components/ui/ShortcutHelpModal";
import { formatShortcut, type ShortcutAction } from "@/hooks/useKeyboardShortcuts";

const SHORTCUTS: ShortcutAction[] = [
  {
    id: "command-palette",
    label: "Open Command Palette",
    keys: ["ctrl+k", "control+k"],
    macKeys: ["cmd+k"],
    handler: () => undefined,
    category: "General",
  },
  {
    id: "shortcut-help",
    label: "Show Keyboard Shortcuts",
    keys: ["ctrl+?", "control+/"],
    handler: () => undefined,
    category: "General",
  },
];

describe("formatShortcut (#899)", () => {
  it("formats modifiers and keys for display", () => {
    expect(formatShortcut("ctrl+shift+h")).toBe("Ctrl+Shift+H");
    expect(formatShortcut("cmd+k")).toBe("⌘+K");
    expect(formatShortcut("escape")).toBe("Esc");
  });

  it("maps control and ctrl to the same label so aliases can be deduplicated", () => {
    expect(formatShortcut("control+k")).toBe(formatShortcut("ctrl+k"));
  });
});

describe("ShortcutHelpModal (#899)", () => {
  const displayKeys = (action: ShortcutAction) =>
    Array.from(new Set(action.keys.map(formatShortcut)));

  it("lists each action once with its alternatives joined by 'or'", () => {
    render(
      <ShortcutHelpModal
        isOpen
        onClose={() => undefined}
        shortcuts={SHORTCUTS}
        getDisplayKeys={displayKeys}
      />
    );

    expect(screen.getByRole("dialog", { name: "Keyboard Shortcuts" })).toBeTruthy();
    expect(screen.getByText("Open Command Palette")).toBeTruthy();
    // ctrl+k and control+k are the same key, so only one chip is shown.
    expect(screen.getAllByText("Ctrl+K")).toHaveLength(1);
    // ctrl+? and control+/ are alternatives, so both are shown with "or".
    expect(screen.getByText("Ctrl+?")).toBeTruthy();
    expect(screen.getByText("Ctrl+/")).toBeTruthy();
    expect(screen.getAllByText("or").length).toBeGreaterThan(0);
  });

  it("does not render when closed", () => {
    render(
      <ShortcutHelpModal
        isOpen={false}
        onClose={() => undefined}
        shortcuts={SHORTCUTS}
        getDisplayKeys={displayKeys}
      />
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("ShortcutHelpButton (#899)", () => {
  it("is a labelled button that requests the shortcut dialog", () => {
    const listener = jest.fn();
    window.addEventListener(OPEN_SHORTCUT_HELP_EVENT, listener);

    render(<ShortcutHelpButton />);
    const button = screen.getByRole("button", { name: "Keyboard shortcuts" });
    fireEvent.click(button);

    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener(OPEN_SHORTCUT_HELP_EVENT, listener);
  });
});
