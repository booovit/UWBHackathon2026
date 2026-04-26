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
import { useSavedStepPlans } from "@/features/library/useSavedStepPlans";
import { useProfile } from "@/features/profile/ProfileProvider";
import { inferStudyModeFromMessage } from "@/features/study/inferStudyModeFromMessage";
import { STUDY_MODES, StudyModeSelector } from "@/features/study/StudyModeSelector";
import {
  ArtifactMessageRenderer,
  TextResponseRenderer,
} from "@/features/study/ArtifactRenderers";
import type { ChatMessage } from "@/types/chat";
import type { StudyMode } from "@/types/profile";
import type {
  FlashcardsArtifact,
  QuizArtifact,
  StepsArtifact,
} from "@/types/studyArtifacts";

interface Props {
  docId: string;
  documentTitle?: string;
}

function sortMessages(messages: ChatMessage[]) {
  return [...messages].sort((a, b) => {
    const timeA = a.timestamp?.toMillis() ?? a.createdAt ?? 0;
    const timeB = b.timestamp?.toMillis() ?? b.createdAt ?? 0;
    if (timeA !== timeB) return timeA - timeB;
    if (a.role !== b.role) return a.role === "user" ? -1 : 1;
    return a.id.localeCompare(b.id);
  });
}

function hasSavedMatch(saved: ChatMessage[], pending: ChatMessage) {
  return saved.some(
    (message) =>
      message.role === pending.role &&
      message.content === pending.content &&
      message.mode === pending.mode,
  );
}

export function ChatPanel({ docId, documentTitle }: Props) {
  const { profile, saveProfile } = useProfile();
  const { createDeck } = useFlashcardDecks();
  const { createQuiz } = useSavedQuizzes();
  const { createStepPlan } = useSavedStepPlans();
  const [mode, setMode] = useState<StudyMode>(
    profile.studyPreferences.defaultStudyMode,
  );
  const [chatIdByMode, setChatIdByMode] = useState<Partial<Record<StudyMode, string>>>({});
  const [messagesByChat, setMessagesByChat] = useState<Record<string, ChatMessage[]>>({});
  const [pendingMessagesByMode, setPendingMessagesByMode] = useState<
    Partial<Record<StudyMode, ChatMessage[]>>
  >({});
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listenerError, setListenerError] = useState<string | null>(null);
  const [saveHint, setSaveHint] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const activeChatId = chatIdByMode[mode] ?? null;
  const messages = activeChatId ? (messagesByChat[activeChatId] ?? []) : [];
  const pendingMessages = pendingMessagesByMode[mode] ?? [];
  const visibleMessages = useMemo(
    () => sortMessages([...messages, ...pendingMessages]),
    [messages, pendingMessages],
  );

  useEffect(() => {
    if (!activeChatId) {
      return;
    }
    if (!firebaseConfigured) {
      setListenerError(null);
      return;
    }
    const q = query(
      collection(db, "documents", docId, "chats", activeChatId, "messages"),
      orderBy("timestamp", "asc"),
    );
    return onSnapshot(
      q,
      (snap) => {
        setListenerError(null);
        const next = sortMessages(
          snap.docs.map(
            (d) => ({ id: d.id, ...(d.data() as Omit<ChatMessage, "id">) }),
          ),
        );
        setMessagesByChat((prev) => ({ ...prev, [activeChatId]: next }));
        setPendingMessagesByMode((prev) => ({
          ...prev,
          [mode]: (prev[mode] ?? []).filter(
            (pending) => !hasSavedMatch(next, pending),
          ),
        }));
      },
      (err) => {
        setListenerError(
          err instanceof Error ? err.message : "Could not load messages.",
        );
      },
    );
  }, [docId, activeChatId, mode]);

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [visibleMessages]);

  const placeholder = useMemo(
    () => STUDY_MODES.find((m) => m.value === mode)?.placeholder ?? "",
    [mode],
  );

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || busy) return;

    const inferred = inferStudyModeFromMessage(trimmed);
    const effectiveMode = inferred ?? mode;

    if (inferred && inferred !== mode) {
      setMode(inferred);
      setError(null);
      setListenerError(null);
      setSaveHint(null);
      void saveProfile({
        studyPreferences: {
          ...profile.studyPreferences,
          defaultStudyMode: inferred,
        },
      }).catch((err) => {
        console.error("Could not save study mode from message hint", err);
      });
    }

    const optimisticUserMessage: ChatMessage = {
      id: `pending-${Date.now()}-${Math.random()}`,
      role: "user",
      content: trimmed,
      retrievedChunkIds: [],
      citations: [],
      mode: effectiveMode,
      createdAt: Date.now(),
    };
    setPendingMessagesByMode((prev) => ({
      ...prev,
      [effectiveMode]: [...(prev[effectiveMode] ?? []), optimisticUserMessage],
    }));
    setInput("");
    setBusy(true);
    setError(null);
    try {
      const currentChatId = chatIdByMode[effectiveMode];
      const result = await callChatWithDocument({
        docId,
        chatId: currentChatId,
        message: trimmed,
        mode: effectiveMode,
      });
      const returnedId = result.data.chatId;
      setChatIdByMode((prev) =>
        prev[effectiveMode] === returnedId
          ? prev
          : { ...prev, [effectiveMode]: returnedId },
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not get a response");
    } finally {
      setBusy(false);
    }
  }

  async function saveFlashcardsToLibrary(artifact: FlashcardsArtifact) {
    setSaveHint(null);
    const title = documentTitle?.trim() || "Document";
    try {
      if (artifact.cards.length === 0) {
        throw new Error("No flashcards found to save.");
      }
      await createDeck(`Flashcards · ${title}`, artifact.cards, docId);
      setSaveHint("Flashcards saved to your library.");
      window.setTimeout(() => setSaveHint(null), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save flashcards.");
    }
  }

  async function saveQuizToLibrary(artifact: QuizArtifact, fallbackText: string) {
    setSaveHint(null);
    const title = documentTitle?.trim() || "Document";
    try {
      if ((artifact.questions ?? []).length === 0) {
        throw new Error("No quiz questions found to save.");
      }
      await createQuiz(
        `Quiz · ${title}`,
        fallbackText.trim(),
        docId,
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
    const title = documentTitle?.trim() || "Document";
    try {
      if ((artifact.steps ?? []).length === 0) {
        throw new Error("No steps found to save.");
      }
      await createStepPlan(
        `Steps · ${title}`,
        artifact.steps,
        fallbackText.trim(),
        docId,
      );
      setSaveHint("Step-by-step plan saved to your library.");
      window.setTimeout(() => setSaveHint(null), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save steps.");
    }
  }

  return (
    <div className="card stack" aria-label="Study chat">
      <div className="row" style={{ alignItems: "flex-start" }}>
        <StudyModeSelector
          mode={mode}
          onModeChange={(nextMode) => {
            if (mode === nextMode) return;
            setMode(nextMode);
            setInput("");
            setError(null);
            setListenerError(null);
            setSaveHint(null);
          }}
        />
        {activeChatId && (
          <button
            type="button"
            className="button ghost"
            style={{ marginLeft: "auto" }}
            onClick={() => {
              setChatIdByMode((prev) => ({ ...prev, [mode]: undefined }));
              setInput("");
              setError(null);
              setListenerError(null);
              setSaveHint(null);
            }}
            title="Start a fresh thread for this mode"
          >
            New thread
          </button>
        )}
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
        {visibleMessages.length === 0 ? (
          <p className="muted">
            Ask a question or pick a study mode. Answers are grounded in this
            document and shaped by your accessibility profile.
          </p>
        ) : (
          visibleMessages.map((m) => (
            <div key={m.id} className={`message ${m.role}`}>
              <span className="muted" style={{ fontSize: "0.85em" }}>
                {m.role === "user" ? "You" : "Tutor"} · {m.mode ?? "chat"}
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
                />
              )}
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
