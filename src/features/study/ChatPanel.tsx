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
import { db, firebaseConfigured } from "@/lib/firebase";
import { callChatWithDocument } from "@/lib/functions";
import { useFlashcardDecks } from "@/features/library/useFlashcardDecks";
import { useSavedQuizzes } from "@/features/library/useSavedQuizzes";
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
  documentTitle?: string;
}

function sortMessages(messages: ChatMessage[]) {
  return [...messages].sort((a, b) => {
    const timeA = a.timestamp?.toMillis() ?? 0;
    const timeB = b.timestamp?.toMillis() ?? 0;
    if (timeA !== timeB) return timeA - timeB;
    if (a.role !== b.role) return a.role === "user" ? -1 : 1;
    return a.id.localeCompare(b.id);
  });
}

export function ChatPanel({ docId, documentTitle }: Props) {
  const { profile } = useProfile();
  const { createDeck } = useFlashcardDecks();
  const { createQuiz } = useSavedQuizzes();
  const [mode, setMode] = useState<StudyMode>(
    profile.studyPreferences.defaultStudyMode,
  );
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listenerError, setListenerError] = useState<string | null>(null);
  const [saveHint, setSaveHint] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chatId) {
      setMessages([]);
      return;
    }
    if (!firebaseConfigured) {
      setListenerError(null);
      return;
    }
    const q = query(
      collection(db, "documents", docId, "chats", chatId, "messages"),
      orderBy("timestamp", "asc"),
    );
    return onSnapshot(
      q,
      (snap) => {
        setListenerError(null);
        setMessages(
          sortMessages(
            snap.docs.map(
              (d) => ({ id: d.id, ...(d.data() as Omit<ChatMessage, "id">) }),
            ),
          ),
        );
      },
      (err) => {
        setListenerError(
          err instanceof Error ? err.message : "Could not load messages.",
        );
      },
    );
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

  async function saveFlashcardsToLibrary(assistantText: string) {
    setSaveHint(null);
    const title = documentTitle?.trim() || "Document";
    try {
      await createDeck(
        `Flashcards · ${title}`,
        [
          {
            front: "Generated in study",
            back: assistantText.slice(0, 12000),
          },
        ],
        docId,
      );
      setSaveHint("Flashcards saved to your library.");
      window.setTimeout(() => setSaveHint(null), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save flashcards.");
    }
  }

  async function saveQuizToLibrary(assistantText: string) {
    setSaveHint(null);
    const title = documentTitle?.trim() || "Document";
    try {
      await createQuiz(`Quiz · ${title}`, assistantText, docId);
      setSaveHint("Quiz saved to your library.");
      window.setTimeout(() => setSaveHint(null), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save quiz.");
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
              {(m.citations?.length ?? 0) > 0 && (
                <span className="muted" style={{ fontSize: "0.85em" }}>
                  Sources:{" "}
                  {(m.citations ?? [])
                    .map((c) =>
                      c.pageNumber !== null
                        ? `p.${c.pageNumber}`
                        : (c.heading ?? c.chunkId.slice(0, 6)),
                    )
                    .join(", ")}
                </span>
              )}
              {m.role === "assistant" && mode === "flashcards" && (
                <div className="row" style={{ marginTop: "var(--space-2)" }}>
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => void saveFlashcardsToLibrary(m.content)}
                  >
                    Save to library
                  </button>
                </div>
              )}
              {m.role === "assistant" && mode === "quiz" && (
                <div className="row" style={{ marginTop: "var(--space-2)" }}>
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => void saveQuizToLibrary(m.content)}
                  >
                    Save quiz to library
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {listenerError && (
        <div className="error-banner" role="alert">
          {listenerError}
        </div>
      )}

      {error && (
        <div className="error-banner" role="alert">
          {error}
        </div>
      )}

      {saveHint && (
        <div className="info-banner" role="status">
          {saveHint}
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
