import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ChatPanel } from "./ChatPanel";

function MockDefaultChatTransport(_options: unknown) {}

const mockSendMessage = vi.hoisted(() => vi.fn());
const chatHookState = vi.hoisted(() => ({
  current: {
    messages: [] as Array<{
      id: string;
      role: string;
      parts: Array<Record<string, unknown>>;
    }>,
    sendMessage: mockSendMessage,
    status: "ready",
    error: undefined as Error | undefined,
  },
}));

vi.mock("ai", () => ({
  DefaultChatTransport: MockDefaultChatTransport,
}));

vi.mock("@ai-sdk/react", () => ({
  useChat: () => chatHookState.current,
}));

describe("ChatPanel", () => {
  beforeEach(() => {
    mockSendMessage.mockReset();
    chatHookState.current = {
      messages: [],
      sendMessage: mockSendMessage,
      status: "ready",
      error: undefined,
    };
  });

  it("submits ready input and clears the composer", () => {
    render(<ChatPanel />);

    const input = screen.getByPlaceholderText("Type a message...");
    fireEvent.change(input, { target: { value: "  summarize this  " } });
    fireEvent.submit(input.closest("form") as HTMLFormElement);

    expect(mockSendMessage).toHaveBeenCalledWith({ text: "  summarize this  " });
    expect(input).toHaveValue("");
  });

  it("toggles visible tool output", () => {
    chatHookState.current = {
      messages: [
        {
          id: "assistant-1",
          role: "assistant",
          parts: [
            {
              type: "tool-search",
              state: "output-available",
              input: { query: "kernel" },
              output: { ok: true },
            },
          ],
        },
      ],
      sendMessage: mockSendMessage,
      status: "ready",
      error: undefined,
    };

    render(<ChatPanel />);

    fireEvent.click(screen.getByRole("button", { name: "▶ show output" }));

    expect(screen.getByText(/"ok": true/)).toBeInTheDocument();
  });
});
