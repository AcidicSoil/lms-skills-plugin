export type MessageContent =
  | { type: "text"; text: string }
  | { type: string; [key: string]: unknown };
export type MessageInput = string | { content: string | MessageContent[] } | unknown;

function createTimeoutSignal(
  parent: AbortSignal | undefined,
  timeoutMs: number,
): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController();
  let settled = false;

  const abort = () => {
    if (settled) return;
    settled = true;
    controller.abort(parent?.reason ?? new Error("Prompt preprocessor scan timed out."));
  };

  if (parent?.aborted) abort();
  parent?.addEventListener("abort", abort, { once: true });

  const timer = setTimeout(abort, timeoutMs);
  return {
    signal: controller.signal,
    cleanup: () => {
      settled = true;
      clearTimeout(timer);
      parent?.removeEventListener("abort", abort);
    },
  };
}

export function extractText(message: MessageInput): string {
  if (typeof message === "string") return message;
  if (message !== null && typeof message === "object") {
    const m = message as Record<string, unknown>;
    if (typeof m.content === "string") return m.content;
    if (Array.isArray(m.content)) {
      return m.content
        .filter(
          (c): c is MessageContent =>
            typeof c === "object" &&
            c !== null &&
            (c as MessageContent).type === "text",
        )
        .map((c) => (c as { type: "text"; text: string }).text)
        .join("");
    }
    if (typeof m.text === "string") return m.text;
  }
  return String(message ?? "");
}

export function inputPreview(text: string): string {
  const compact = text.replace(/\s+/g, " ").trim();
  return compact.length > 180 ? `${compact.slice(0, 177)}...` : compact;
}

export function normalizeUserMessageText(text: string): string {
  return text.replace(/^\s*user:\s*/i, "");
}
export function injectExplicitIntoMessage(
  message: MessageInput,
  injection: string,
  payload: string,
  skillNames: string[],
): MessageInput {
  const skillAttr = skillNames.join(",") || "unresolved";
  const content = `${injection}\n\n<task_payload for_expanded_skills="${skillAttr}">\n${payload}\n</task_payload>`;
  if (typeof message === "string") {
    return content;
  }
  if (message !== null && typeof message === "object") {
    const m = message as Record<string, unknown>;
    if (typeof m.content === "string") {
      return { ...m, content };
    }
    if (Array.isArray(m.content)) {
      const first = m.content.findIndex(
        (c) =>
          typeof c === "object" &&
          c !== null &&
          (c as MessageContent).type === "text",
      );
      if (first !== -1) {
        const updated = [...m.content] as MessageContent[];
        const block = updated[first] as { type: "text"; text: string };
        updated[first] = { ...block, text: content };
        return { ...m, content: updated };
      }
      return { ...m, content: [{ type: "text", text: content }, ...m.content] };
    }
  }
  return message;
}

export function injectIntoMessage(
  message: MessageInput,
  injection: string,
): MessageInput {
  if (typeof message === "string") {
    return `${injection}\n\n---\n\n${message}`;
  }
  if (message !== null && typeof message === "object") {
    const m = message as Record<string, unknown>;
    if (typeof m.content === "string") {
      return { ...m, content: `${injection}\n\n---\n\n${m.content}` };
    }
    if (Array.isArray(m.content)) {
      const first = m.content.findIndex(
        (c) =>
          typeof c === "object" &&
          c !== null &&
          (c as MessageContent).type === "text",
      );
      if (first !== -1) {
        const updated = [...m.content] as MessageContent[];
        const block = updated[first] as { type: "text"; text: string };
        updated[first] = {
          ...block,
          text: `${injection}\n\n---\n\n${block.text}`,
        };
        return { ...m, content: updated };
      }
      return {
        ...m,
        content: [{ type: "text", text: injection }, ...m.content],
      };
    }
  }
  return message;
}
