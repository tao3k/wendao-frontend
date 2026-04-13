import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useChatStore } from "../../stores/chatStore";
import { ChatFab } from "./ChatFab";

vi.mock("./ChatPanel", () => ({
  ChatPanel: () => <div data-testid="chat-panel">Chat panel</div>,
}));

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  },
}));

describe("ChatFab", () => {
  beforeEach(() => {
    window.localStorage.clear();
    useChatStore.setState({ isOpen: false });
  });

  it("toggles the chat panel open and closed", () => {
    render(<ChatFab />);

    fireEvent.click(screen.getByRole("button", { name: "Open chat" }));
    expect(screen.getByTestId("chat-panel")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close chat" }));
    expect(screen.queryByTestId("chat-panel")).not.toBeInTheDocument();
  });
});
