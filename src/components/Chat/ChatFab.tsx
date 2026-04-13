import { MessageCircle, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useChatStore } from "../../stores/chatStore";
import { ChatPanel } from "./ChatPanel";
import "./ChatPanel.css";

export function ChatFab() {
  const { isOpen, toggle } = useChatStore();

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
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
