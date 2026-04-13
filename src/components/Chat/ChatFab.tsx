import { MessageCircle, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useChatStore } from "../../stores/chatStore";
import { ChatPanel } from "./ChatPanel";
import "./ChatPanel.css";

const FAB_PANEL_INITIAL = { opacity: 0, y: 20, scale: 0.95 } as const;
const FAB_PANEL_ANIMATE = { opacity: 1, y: 0, scale: 1 } as const;
const FAB_PANEL_EXIT = { opacity: 0, y: 20, scale: 0.95 } as const;
const FAB_PANEL_TRANSITION = { duration: 0.2, ease: [0.16, 1, 0.3, 1] } as const;

export function ChatFab() {
  const { isOpen, toggle } = useChatStore();

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={FAB_PANEL_INITIAL}
            animate={FAB_PANEL_ANIMATE}
            exit={FAB_PANEL_EXIT}
            transition={FAB_PANEL_TRANSITION}
          >
            <ChatPanel />
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        className="chat-fab"
        data-open={isOpen}
        onClick={toggle}
        aria-label={isOpen ? "Close chat" : "Open chat"}
      >
        {isOpen ? <X size={20} /> : <MessageCircle size={20} />}
      </button>
    </>
  );
}
