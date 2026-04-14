import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { type ChangeEvent, type FormEvent, useCallback, useState } from "react";
import { ToolInvocation } from "./ToolInvocation";

const transport = new DefaultChatTransport({ api: "/vercel/stream" });
const PRE_WRAP_TEXT_STYLE = { whiteSpace: "pre-wrap" } as const;

export function ChatPanel() {
  const { messages, sendMessage, status, error } = useChat({ transport });
  const [input, setInput] = useState("");

  const isReady = status === "ready";
  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (input.trim() && isReady) {
        sendMessage({ text: input });
        setInput("");
      }
    },
    [input, isReady, sendMessage],
  );
  const handleInputChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setInput(event.target.value);
  }, []);

  return (
    <div className="chat-panel">
      <div className="chat-panel__header">Ask AI</div>

      <div className="chat-panel__messages">
        {messages.length === 0 && (
          <div className="chat-panel__empty">
            <p>Ask a question about the knowledge base.</p>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`chat-msg chat-msg--${msg.role}`}>
            <div className="chat-msg__bubble">
              {msg.parts.map((part, i) => {
                if (part.type === "text") {
                  return (
                    <span key={i} style={PRE_WRAP_TEXT_STYLE}>
                      {part.text}
                    </span>
                  );
                }
                if (part.type === "step-start" && i > 0) {
                  return <hr key={i} className="chat-msg__step-divider" />;
                }
                if (part.type.startsWith("tool-")) {
                  return <ToolInvocation key={i} part={part as any} />;
                }
                return null;
              })}
            </div>
          </div>
        ))}

        {(status === "submitted" || status === "streaming") && (
          <div className="chat-panel__status">
            {status === "submitted" ? "Thinking..." : "Streaming..."}
          </div>
        )}
      </div>

      {error && <div className="chat-panel__error">Error: {error.message}</div>}

      <form className="chat-panel__input-area" onSubmit={handleSubmit}>
        <input
          className="chat-panel__input"
          value={input}
          onChange={handleInputChange}
          placeholder="Type a message..."
          disabled={!isReady}
        />
        <button type="submit" className="chat-panel__send" disabled={!isReady || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
