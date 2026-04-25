import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import type { Timestamp } from "firebase/firestore";
import { db, firebaseConfigured } from "@/lib/firebase";
import { callQuickChat } from "@/lib/functions";
import { useAuth } from "@/features/auth/AuthProvider";

interface QuickMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp?: Timestamp;
}

const SUGGESTIONS = [
  "Explain photosynthesis simply",
  "Quiz me on World War II causes",
  "Break a 5-page essay into steps",
  "Make flashcards for the Krebs cycle",
];

export function QuickChat({ embedded }: { embedded?: boolean }) {
  const { user, loading: authLoading } = useAuth();
  const [messages, setMessages] = useState<QuickMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listenerError, setListenerError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || !firebaseConfigured) {
      setMessages([]);
      setListenerError(null);
      return;
    }
    const q = query(
      collection(db, "users", user.uid, "quickChat", "main", "messages"),
      orderBy("timestamp", "asc"),
      limit(50),
    );
    return onSnapshot(
      q,
      (snap) => {
        setListenerError(null);
        setMessages(
          snap.docs.map(
            (d) => ({ id: d.id, ...(d.data() as Omit<QuickMessage, "id">) }),
          ),
        );
      },
      (err) => {
        setListenerError(
          err instanceof Error ? err.message : "Could not load messages.",
        );
      },
    );
  }, [user]);

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  function appendLocal(role: "user" | "assistant", content: string) {
    setMessages((prev) => [
      ...prev,
      {
        id: `local-${Date.now()}-${Math.random()}`,
        role,
        content,
      },
    ]);
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;

    if (!firebaseConfigured) {
      appendLocal("user", trimmed);
      setBusy(true);
      window.setTimeout(() => {
        appendLocal(
          "assistant",
          "(Demo mode — Firebase isn't configured yet.)\n\nOnce you add your Firebase config and Gemini API key, this is where the real Studylift tutor will reply, grounded in your accessibility profile and any uploaded documents.",
        );
        setBusy(false);
      }, 500);
      setInput("");
      return;
    }

    if (!user) {
      setError("Still preparing your session — try again in a second.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await callQuickChat({ message: trimmed });
      setInput("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not get a response");
    } finally {
      setBusy(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void send(input);
  }

  return (
    <div
      className={embedded ? "chat-shell" : "card chat-shell"}
      aria-labelledby="quickchat-title"
    >
      <h2 id="quickchat-title" className="visually-hidden">
        Tutor chat
      </h2>

      <div ref={listRef} className="chat-thread" aria-live="polite">
        {messages.length === 0 ? (
          <div className="empty">
            <strong style={{ fontSize: "1.05rem" }}>
              Ask the tutor anything
            </strong>
            <p style={{ margin: 0, maxWidth: "44ch" }}>
              Need a quick explanation, a study quiz, or help breaking down an
              assignment? Try a suggestion or type your own question.
            </p>
            <div className="prompt-suggestions">
              {SUGGESTIONS.map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => {
                    setInput(s);
                    void send(s);
                  }}
                  disabled={busy}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`message ${m.role}`}>
              <span className="muted" style={{ fontSize: "0.78rem" }}>
                {m.role === "user" ? "You" : "Tutor"}
              </span>
              <span style={{ whiteSpace: "pre-wrap" }}>{m.content}</span>
            </div>
          ))
        )}
        {busy && (
          <div className="message assistant" aria-live="polite">
            <span className="muted" style={{ fontSize: "0.78rem" }}>
              Tutor
            </span>
            <span>Thinking…</span>
          </div>
        )}
      </div>

      {(error || authLoading || listenerError) && (
        <div style={{ padding: "0 var(--space-4)", paddingTop: "var(--space-3)" }}>
          {authLoading && <p className="muted">Preparing your session…</p>}
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
        </div>
      )}

      <form className="chat-composer" onSubmit={onSubmit}>
        <textarea
          aria-label="Your message"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            firebaseConfigured
              ? "Ask the tutor anything…"
              : "Demo mode — type anything to see the chat layout."
          }
          rows={2}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(input);
            }
          }}
        />
        <button type="submit" className="button" disabled={busy}>
          Send
        </button>
      </form>
    </div>
  );
}
