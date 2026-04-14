import { useCallback, useState } from "react";

interface ToolInvocationProps {
  part: {
    type: string;
    toolCallId?: string;
    state?: string;
    input?: Record<string, unknown>;
    output?: unknown;
  };
}

export function ToolInvocation({ part }: ToolInvocationProps) {
  const [expanded, setExpanded] = useState(false);

  const toolName = part.type.startsWith("tool-") ? part.type.slice(5) : "unknown";
  const { input, output, state } = part;
  const isRunning = state === "input-streaming" || state === "input-available";
  const hasOutput = state === "output-available" && output != null;
  const handleToggle = useCallback(() => {
    setExpanded((current) => !current);
  }, []);

  const paramStr =
    input && typeof input === "object"
      ? Object.entries(input)
          .map(([k, v]) => (typeof v === "string" ? `${k}="${v}"` : `${k}=${JSON.stringify(v)}`))
          .join(", ")
      : "";

  return (
    <div className="chat-tool">
      <div className="chat-tool__header">
        <span className="chat-tool__name">{toolName}</span>
        <span className="chat-tool__params">({paramStr})</span>
        {isRunning && <span className="chat-tool__status">running...</span>}
      </div>
      {hasOutput && (
        <div>
          <button type="button" className="chat-tool__toggle" onClick={handleToggle}>
            {expanded ? "▼ hide output" : "▶ show output"}
          </button>
          {expanded && (
            <pre className="chat-tool__output">
              {typeof output === "string" ? output : JSON.stringify(output, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
