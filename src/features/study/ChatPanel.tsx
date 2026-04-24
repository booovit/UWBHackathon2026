import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { callChatWithDocument } from "@/lib/functions";
import { useProfile } from "@/features/profile/ProfileProvider";
import type { ChatMessage } from "@/types/chat";
import type { StudyMode } from "@/types/profile";

const MODES: { value: StudyMode; label: string; placeholder: string }[] = [
  {
    value: "chat",
    label: "Chat",
    placeholder: "Ask a question about this document…",
  },
  {
    value: "summary",
    label: "Summary",
    placeholder: "Summarize this document, or a section.",
  },
  {
    value: "simplify",
    label: "Simplify",
    placeholder: "Paste or describe what you want simplified.",
  },
  {
    value: "quiz",
    label: "Quiz",
    placeholder: "Make a quiz from section 3 (or the whole document).",
  },
  {
    value: "flashcards",
    label: "Flashcards",
    placeholder: "Create flashcards from the key terms.",
  },
  {
    value: "steps",
    label: "Step-by-step",
    placeholder: "Break this assignment into steps.",
  },
];

interface Props {
  docId: string;
}

export function ChatPanel({ docId }: Props) {
  const { profile } = useProfile();
  const [mode, setMode] = useState<StudyMode>(
    profile.studyPreferences.defaultStudyMode,
  );
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chatId) {
      setMessages([]);
      return;
    }
    const q = query(
      collection(db, "documents", docId, "chats", chatId, "messages"),
      orderBy("timestamp", "asc"),
    );
    return onSnapshot(q, (snap) => {
      setMessages(
        snap.docs.map(
          (d) => ({ id: d.id, ...(d.data() as Omit<ChatMessage, "id">) }),
        ),
      );
    });
  }, [docId, chatId]);

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const placeholder = useMemo(
    () => MODES.find((m) => m.value === mode)?.placeholder ?? "",
    [mode],
  );

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!input.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await callChatWithDocument({
        docId,
        chatId: chatId ?? undefined,
        message: input.trim(),
        mode,
      });
      setChatId(result.data.chatId);
      setInput("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not get a response");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card stack" aria-label="Study chat">
      <div className="row" role="tablist" aria-label="Study mode">
        {MODES.map((m) => (
          <button
            key={m.value}
            type="button"
            role="tab"
            aria-selected={mode === m.value}
            className={mode === m.value ? "button" : "button secondary"}
            onClick={() => setMode(m.value)}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div
        ref={listRef}
        className="stack"
        style={{
          maxHeight: 380,
          overflowY: "auto",
          padding: "var(--space-2)",
          gap: "var(--space-3)",
        }}
        aria-live="polite"
      >
        {messages.length === 0 ? (
          <p className="muted">
            Ask a question or pick a study mode. Answers are grounded in this
            document and shaped by your accessibility profile.
          </p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`message ${m.role}`}>
              <span className="muted" style={{ fontSize: "0.85em" }}>
                {m.role === "user" ? "You" : "Tutor"} · {m.mode ?? "chat"}
              </span>
              <span style={{ whiteSpace: "pre-wrap" }}>{m.content}</span>
              {m.citations.length > 0 && (
                <span className="muted" style={{ fontSize: "0.85em" }}>
                  Sources:{" "}
                  {m.citations
                    .map((c) =>
                      c.pageNumber !== null
                        ? `p.${c.pageNumber}`
                        : (c.heading ?? c.chunkId.slice(0, 6)),
                    )
                    .join(", ")}
                </span>
              )}
            </div>
          ))
        )}
      </div>

      {error && (
        <div className="error-banner" role="alert">
          {error}
        </div>
      )}

      <form
        className="row"
        style={{ alignItems: "stretch" }}
        onSubmit={(e) => void send(e)}
      >
        <textarea
          aria-label="Your message"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          rows={2}
          style={{ flex: 1 }}
        />
        <button type="submit" className="button" disabled={busy}>
          {busy ? "Thinking…" : "Send"}
        </button>
      </form>
    </div>
  );
}
