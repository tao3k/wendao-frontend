import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ChatState {
  /** Whether the chat panel is open. */
  isOpen: boolean;
  /** Toggle the chat panel open/closed. */
  toggle: () => void;
  /** Explicitly set the panel state. */
  setOpen: (open: boolean) => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      isOpen: false,
      toggle: () => set((s) => ({ isOpen: !s.isOpen })),
      setOpen: (open) => set({ isOpen: open }),
    }),
    { name: "wendao-chat-panel" },
  ),
);
