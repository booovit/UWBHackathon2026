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
import { useFlashcardDecks } from "@/features/library/useFlashcardDecks";
import { useSavedQuizzes } from "@/features/library/useSavedQuizzes";
import { useSavedStepPlans } from "@/features/library/useSavedStepPlans";
import { useProfile } from "@/features/profile/ProfileProvider";
import { inferStudyModeFromMessage } from "@/features/study/inferStudyModeFromMessage";
import { STUDY_MODES } from "@/features/study/StudyModeSelector";
import {
  ArtifactMessageRenderer,
  TextResponseRenderer,
} from "@/features/study/ArtifactRenderers";
import type { StudyMode } from "@/types/profile";
import type {
  FlashcardsArtifact,
  QuizArtifact,
  StepsArtifact,
  StructuredArtifact,
  StructuredArtifactType,
} from "@/types/studyArtifacts";

interface QuickMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  mode?: string;
  artifactType?: StructuredArtifactType;
  artifact?: StructuredArtifact;
  timestamp?: Timestamp;
  createdAt?: number;
}

function sortMessages(messages: QuickMessage[]) {
  return [...messages].sort((a, b) => {
    const timeA = a.timestamp?.toMillis() ?? a.createdAt ?? 0;
    const timeB = b.timestamp?.toMillis() ?? b.createdAt ?? 0;
    if (timeA !== timeB) return timeA - timeB;
    if (a.role !== b.role) return a.role === "user" ? -1 : 1;
    return a.id.localeCompare(b.id);
  });
}

function hasSavedMatch(saved: QuickMessage[], pending: QuickMessage) {
  return saved.some(
    (message) =>
      message.role === pending.role &&
      message.content === pending.content &&
      (message.mode ?? "") === (pending.mode ?? ""),
  );
}

const SUGGESTIONS = [
  "Explain photosynthesis simply",
  "Quiz me on World War II causes",
  "Break a 5-page essay into steps",
  "Make flashcards for the Krebs cycle",
];

const QUICK_CHAT_LIBRARY_TITLE = "General chat";

export function QuickChat({ embedded }: { embedded?: boolean }) {
  const { user, loading: authLoading } = useAuth();
  const { profile, saveProfile } = useProfile();
  const { createDeck } = useFlashcardDecks();
  const { createQuiz } = useSavedQuizzes();
  const { createStepPlan } = useSavedStepPlans();
  const mode = profile.studyPreferences.defaultStudyMode;
  const [messages, setMessages] = useState<QuickMessage[]>([]);
  const [pendingMessages, setPendingMessages] = useState<QuickMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listenerError, setListenerError] = useState<string | null>(null);
  const [saveHint, setSaveHint] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || !firebaseConfigured) {
      setMessages([]);
      setPendingMessages([]);
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
        const savedMessages = sortMessages(
          snap.docs.map(
            (d) => ({ id: d.id, ...(d.data() as Omit<QuickMessage, "id">) }),
          ),
        );
        setMessages(savedMessages);
        setPendingMessages((prev) =>
          prev.filter((pending) => !hasSavedMatch(savedMessages, pending)),
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
  }, [messages, pendingMessages]);

  const visibleMessages = sortMessages([...messages, ...pendingMessages]);

  async function saveFlashcardsToLibrary(artifact: FlashcardsArtifact) {
    setSaveHint(null);
    try {
      if (artifact.cards.length === 0) {
        throw new Error("No flashcards found to save.");
      }
      await createDeck(`Flashcards · ${QUICK_CHAT_LIBRARY_TITLE}`, artifact.cards, null);
      setSaveHint("Flashcards saved to your library.");
      window.setTimeout(() => setSaveHint(null), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save flashcards.");
    }
  }

  async function saveQuizToLibrary(artifact: QuizArtifact, fallbackText: string) {
    setSaveHint(null);
    try {
      if ((artifact.questions ?? []).length === 0) {
        throw new Error("No quiz questions found to save.");
      }
      await createQuiz(
        `Quiz · ${QUICK_CHAT_LIBRARY_TITLE}`,
        fallbackText.trim(),
        null,
        artifact.questions,
      );
      setSaveHint("Quiz saved to your library.");
      window.setTimeout(() => setSaveHint(null), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save quiz.");
    }
  }

  async function saveStepsToLibrary(artifact: StepsArtifact, fallbackText: string) {
    setSaveHint(null);
    try {
      if ((artifact.steps ?? []).length === 0) {
        throw new Error("No steps found to save.");
      }
      await createStepPlan(
        `Steps · ${QUICK_CHAT_LIBRARY_TITLE}`,
        artifact.steps,
        fallbackText.trim(),
        null,
      );
      setSaveHint("Step-by-step plan saved to your library.");
      window.setTimeout(() => setSaveHint(null), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save steps.");
    }
  }

  function appendLocal(role: "user" | "assistant", content: string) {
    setMessages((prev) => [
      ...prev,
      {
        id: `local-${Date.now()}-${Math.random()}`,
        role,
        content,
        createdAt: Date.now(),
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
          "(Demo mode — Firebase isn't configured yet.)\n\nOnce you add your Firebase config and Gemini API key, this is where the real Axessify tutor will reply, grounded in your accessibility profile and any uploaded documents.",
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

    const inferred = inferStudyModeFromMessage(trimmed);
    const effectiveMode: StudyMode = inferred ?? mode;

    if (inferred && inferred !== mode) {
      void saveProfile({
        studyPreferences: {
          ...profile.studyPreferences,
          defaultStudyMode: inferred,
        },
      }).catch((err) => {
        console.error("Could not save study mode from message hint", err);
      });
    }

    setPendingMessages((prev) => [
      ...prev,
      {
        id: `pending-${Date.now()}-${Math.random()}`,
        role: "user",
        content: trimmed,
        mode: effectiveMode,
        createdAt: Date.now(),
      },
    ]);
    setInput("");
    setBusy(true);
    setError(null);
    try {
      await callQuickChat({ message: trimmed, mode: effectiveMode });
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
        {visibleMessages.length === 0 ? (
          <div className="empty">
            <strong style={{ fontSize: "1.05rem" }}>
              Ask the tutor anything
            </strong>
            <p style={{ margin: 0, maxWidth: "22rem" }}>
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
          visibleMessages.map((m) => (
            <div key={m.id} className={`message ${m.role}`}>
              <span className="muted" style={{ fontSize: "0.78rem" }}>
                {m.role === "user" ? "You" : "Tutor"}
                {m.mode ? ` · ${m.mode}` : ""}
              </span>
              {m.role === "assistant" && m.artifactType ? (
                <span className="muted" style={{ fontSize: "0.88em" }}>
                  Interactive {m.artifactType} generated.
                </span>
              ) : m.role === "assistant" ? (
                <TextResponseRenderer content={m.content} />
              ) : (
                <span className="message-content">{m.content}</span>
              )}
              {m.role === "assistant" && (
                <ArtifactMessageRenderer
                  artifactType={m.artifactType}
                  artifact={m.artifact}
                  compact
                />
              )}
              {m.role === "assistant" &&
                m.artifactType === "flashcards" &&
                m.artifact &&
                (m.artifact as FlashcardsArtifact).cards?.length > 0 && (
                <div className="row" style={{ marginTop: "var(--space-2)" }}>
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() =>
                      void saveFlashcardsToLibrary(m.artifact as FlashcardsArtifact)
                    }
                  >
                    Save to library
                  </button>
                </div>
              )}
              {m.role === "assistant" &&
                m.artifactType === "quiz" &&
                m.artifact &&
                (m.artifact as QuizArtifact).questions?.length > 0 && (
                <div className="row" style={{ marginTop: "var(--space-2)" }}>
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() =>
                      void saveQuizToLibrary(m.artifact as QuizArtifact, m.content)
                    }
                  >
                    Save quiz to library
                  </button>
                </div>
              )}
              {m.role === "assistant" &&
                m.artifactType === "steps" &&
                m.artifact &&
                (m.artifact as StepsArtifact).steps?.length > 0 && (
                <div className="row" style={{ marginTop: "var(--space-2)" }}>
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() =>
                      void saveStepsToLibrary(m.artifact as StepsArtifact, m.content)
                    }
                  >
                    Save step plan to library
                  </button>
                </div>
              )}
            </div>
          ))
        )}
        {busy && (
          <div className="message assistant" aria-live="polite">
            <span className="muted" style={{ fontSize: "0.78rem" }}>
              Tutor
            </span>
            <span className="message-content">Thinking…</span>
          </div>
        )}
      </div>

      {(error || authLoading || listenerError || saveHint) && (
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
          {saveHint && (
            <div className="info-banner" role="status">
              {saveHint}
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
              ? (STUDY_MODES.find((m) => m.value === mode)?.placeholder ??
                "Ask the tutor anything…")
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
