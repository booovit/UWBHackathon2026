import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useDocuments } from "@/features/documents/useDocuments";
import { useFlashcardDecks } from "@/features/library/useFlashcardDecks";
import { useSavedQuizzes } from "@/features/library/useSavedQuizzes";
import { useSavedStepPlans } from "@/features/library/useSavedStepPlans";
import { useStudyFolders } from "@/features/library/useStudyFolders";
import { useAuth } from "@/features/auth/AuthProvider";
import { useProfile } from "@/features/profile/ProfileProvider";
import {
  FlashcardDeckViewer,
  QuizRunner,
  StepsViewer,
} from "@/features/study/ArtifactRenderers";
import { firebaseConfigured } from "@/lib/firebase";
import type { StudyDocument } from "@/types/document";
import type { FlashcardDeck } from "@/types/library";
import type { SavedQuiz, SavedStepPlan } from "@/types/library";

export function DashboardPage() {
  const { documents, loading, error: docsError } = useDocuments();
  const { isGuest, isDemoUser } = useAuth();
  const { profile } = useProfile();
  const {
    folders,
    loading: foldersLoading,
    error: foldersError,
    createFolder,
    addDocumentToFolder,
    removeDocumentFromFolder,
    addDeckToFolder,
    removeDeckFromFolder,
    addQuizToFolder,
    removeQuizFromFolder,
    addStepPlanToFolder,
    removeStepPlanFromFolder,
    removeFolder,
  } = useStudyFolders();
  const {
    decks,
    loading: decksLoading,
    error: decksError,
    removeDeck,
  } = useFlashcardDecks();
  const {
    quizzes,
    loading: quizzesLoading,
    error: quizzesError,
    removeQuiz,
  } = useSavedQuizzes();
  const {
    plans: stepPlans,
    loading: stepPlansLoading,
    error: stepPlansError,
    removePlan: removeStepPlan,
  } = useSavedStepPlans();

  const [newFolderName, setNewFolderName] = useState("");
  const [folderBusy, setFolderBusy] = useState(false);

  async function onCreateFolder() {
    if (!newFolderName.trim()) return;
    setFolderBusy(true);
    try {
      await createFolder(newFolderName);
      setNewFolderName("");
    } finally {
      setFolderBusy(false);
    }
  }

  const docById = Object.fromEntries(
    documents.map((d) => [d.id, d] as const),
  ) as Record<string, StudyDocument>;

  const deckById = useMemo(
    () => Object.fromEntries(decks.map((d) => [d.id, d] as const)),
    [decks],
  );
  const quizById = useMemo(
    () => Object.fromEntries(quizzes.map((q) => [q.id, q] as const)),
    [quizzes],
  );
  const planById = useMemo(
    () => Object.fromEntries(stepPlans.map((p) => [p.id, p] as const)),
    [stepPlans],
  );

  return (
    <section className="stack" aria-labelledby="library-title">
      <header className="stack" style={{ gap: "var(--space-2)" }}>
        <h1 id="library-title">Your library</h1>
        <p className="muted">
          Past chats, documents, and study artifacts you have generated. Go to
          <Link to="/study"> Study</Link> to chat, upload, and work in one
          place.
        </p>
      </header>

      {!firebaseConfigured && (
        <div className="info-banner" role="status">
          <strong>Preview mode.</strong> Folders, flashcards, quizzes, and
          step plans are saved in this browser only. Add <code>.env.local</code>{" "}
          to sync to Firebase.
        </div>
      )}

      {isDemoUser && firebaseConfigured && (
        <div className="info-banner" role="status">
          <strong>Offline session.</strong> Sign in to sync your library to the
          cloud, or your library is stored locally in this browser.
        </div>
      )}

      {docsError && (
        <div className="error-banner" role="alert">
          {docsError}
        </div>
      )}

      {isGuest && (
        <div
          className="card row"
          style={{ justifyContent: "space-between", flexWrap: "wrap" }}
        >
          <div style={{ minWidth: 0 }}>
            <strong>Guest mode.</strong>
            <p className="muted" style={{ margin: 0 }}>
              Sign in to keep your library when you switch devices.
            </p>
          </div>
          <Link to="/login" className="button">
            Sign in
          </Link>
        </div>
      )}

      <div className="row" style={{ justifyContent: "flex-end" }}>
        <Link to="/study" className="button">
          Open study workspace
        </Link>
        <Link
          to={profile.onboardingComplete ? "/settings" : "/onboarding"}
          className="button secondary"
        >
          {profile.onboardingComplete
            ? "Accessibility settings"
            : "Set up profile"}
        </Link>
      </div>

      <div className="grid-2" style={{ alignItems: "stretch" }}>
        <section className="card stack" aria-labelledby="chats-heading">
          <h2 id="chats-heading" style={{ fontSize: "1.1rem" }}>
            Chats
          </h2>
          <p className="muted" style={{ margin: 0 }}>
            General study chat and document-scoped conversations.
          </p>
          <ul
            className="stack"
            style={{ listStyle: "none", padding: 0, gap: "var(--space-2)" }}
          >
            <li>
              <Link
                to="/study"
                className="button secondary"
                style={{ width: "100%" }}
              >
                General study chat
              </Link>
            </li>
            {documents
              .filter(
                (d) =>
                  d.status === "ready" ||
                  d.status === "processing" ||
                  d.status === "uploaded",
              )
              .map((d) => (
                <li key={d.id}>
                  <Link
                    to={`/study/${d.id}`}
                    className="button secondary"
                    style={{ width: "100%", textAlign: "left" }}
                  >
                    {d.fileName}
                    {d.status === "processing" && (
                      <span className="muted"> — processing</span>
                    )}
                  </Link>
                </li>
              ))}
            {documents.length === 0 && !loading && (
              <li className="muted" style={{ fontSize: "0.9rem" }}>
                No document chats yet. Add a file from{" "}
                <Link to="/study">Study</Link>.
              </li>
            )}
          </ul>
        </section>

        <section className="card stack" aria-labelledby="folders-heading">
          <h2 id="folders-heading" style={{ fontSize: "1.1rem" }}>
            Folders
          </h2>
          <p className="muted" style={{ margin: 0 }}>
            Group documents, flashcards, quizzes, and step plans. On a document
            in Study, use <strong>Folders</strong> there to add the file in one
            click.
          </p>
          {foldersError && (
            <p className="error-banner" role="alert" style={{ margin: 0 }}>
              {foldersError}
            </p>
          )}

          <div className="row" style={{ flexWrap: "wrap" }}>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="New folder name"
              aria-label="New folder name"
            />
            <button
              type="button"
              className="button"
              onClick={() => void onCreateFolder()}
              disabled={folderBusy || !newFolderName.trim()}
            >
              {folderBusy ? "…" : "Create folder"}
            </button>
          </div>

          {foldersLoading && (
            <p className="muted" style={{ margin: 0, fontSize: "0.9rem" }}>
              Loading folders…
            </p>
          )}

          {!foldersLoading && folders.length === 0 && (
            <p className="muted" style={{ margin: 0, fontSize: "0.9rem" }}>
              No folders yet. Create one, then add study materials with the menus
              below.
            </p>
          )}

          <ul
            className="stack"
            style={{ listStyle: "none", padding: 0, gap: "var(--space-2)" }}
          >
            {folders.map((f) => {
              const hasAnything =
                f.documentIds.length > 0 ||
                f.deckIds.length > 0 ||
                f.quizIds.length > 0 ||
                f.stepPlanIds.length > 0;
              return (
                <li key={f.id} className="card stack" style={{ padding: "var(--space-3)", gap: "var(--space-3)" }}>
                  <div
                    className="row"
                    style={{
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                    }}
                  >
                    <strong>{f.name}</strong>
                    <button
                      type="button"
                      className="button secondary"
                      onClick={() => void removeFolder(f.id)}
                    >
                      Delete folder
                    </button>
                  </div>

                  <div className="stack" style={{ gap: "var(--space-2)" }}>
                    <span className="muted" style={{ fontSize: "0.82rem", fontWeight: 600 }}>
                      Add material
                    </span>
                    <div className="row" style={{ flexWrap: "wrap", gap: "var(--space-2)" }}>
                      {documents.some((d) => d.status !== "failed") && (
                        <label className="row" style={{ gap: "var(--space-2)", alignItems: "center" }}>
                          <span className="muted" style={{ fontSize: "0.85rem" }}>
                            Document
                          </span>
                          <select
                            key={`doc-${f.id}-${f.documentIds.join(",")}`}
                            defaultValue=""
                            aria-label={`Add document to ${f.name}`}
                            onChange={(e) => {
                              const v = e.target.value;
                              if (!v) return;
                              void addDocumentToFolder(f.id, v);
                              e.target.selectedIndex = 0;
                            }}
                          >
                            <option value="">— Document —</option>
                            {documents
                              .filter(
                                (d) =>
                                  !f.documentIds.includes(d.id) &&
                                  d.status !== "failed",
                              )
                              .map((d) => (
                                <option key={d.id} value={d.id}>
                                  {d.fileName}
                                </option>
                              ))}
                          </select>
                        </label>
                      )}
                      {decks.length > 0 && (
                        <label className="row" style={{ gap: "var(--space-2)", alignItems: "center" }}>
                          <span className="muted" style={{ fontSize: "0.85rem" }}>
                            Flashcards
                          </span>
                          <select
                            key={`deck-${f.id}-${f.deckIds.join(",")}`}
                            defaultValue=""
                            aria-label={`Add flashcard deck to ${f.name}`}
                            onChange={(e) => {
                              const v = e.target.value;
                              if (!v) return;
                              void addDeckToFolder(f.id, v);
                              e.target.selectedIndex = 0;
                            }}
                          >
                            <option value="">— Deck —</option>
                            {decks
                              .filter((d) => !f.deckIds.includes(d.id))
                              .map((d) => (
                                <option key={d.id} value={d.id}>
                                  {d.title}
                                </option>
                              ))}
                          </select>
                        </label>
                      )}
                      {quizzes.length > 0 && (
                        <label className="row" style={{ gap: "var(--space-2)", alignItems: "center" }}>
                          <span className="muted" style={{ fontSize: "0.85rem" }}>
                            Quiz
                          </span>
                          <select
                            key={`quiz-${f.id}-${f.quizIds.join(",")}`}
                            defaultValue=""
                            aria-label={`Add quiz to ${f.name}`}
                            onChange={(e) => {
                              const v = e.target.value;
                              if (!v) return;
                              void addQuizToFolder(f.id, v);
                              e.target.selectedIndex = 0;
                            }}
                          >
                            <option value="">— Quiz —</option>
                            {quizzes
                              .filter((q) => !f.quizIds.includes(q.id))
                              .map((q) => (
                                <option key={q.id} value={q.id}>
                                  {q.title}
                                </option>
                              ))}
                          </select>
                        </label>
                      )}
                      {stepPlans.length > 0 && (
                        <label className="row" style={{ gap: "var(--space-2)", alignItems: "center" }}>
                          <span className="muted" style={{ fontSize: "0.85rem" }}>
                            Steps
                          </span>
                          <select
                            key={`plan-${f.id}-${f.stepPlanIds.join(",")}`}
                            defaultValue=""
                            aria-label={`Add step plan to ${f.name}`}
                            onChange={(e) => {
                              const v = e.target.value;
                              if (!v) return;
                              void addStepPlanToFolder(f.id, v);
                              e.target.selectedIndex = 0;
                            }}
                          >
                            <option value="">— Steps —</option>
                            {stepPlans
                              .filter((p) => !f.stepPlanIds.includes(p.id))
                              .map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.title}
                                </option>
                              ))}
                          </select>
                        </label>
                      )}
                    </div>
                    {!documents.some((d) => d.status !== "failed") &&
                      decks.length === 0 &&
                      quizzes.length === 0 &&
                      stepPlans.length === 0 && (
                        <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
                          Nothing to add yet. Upload a document or save items from
                          Study — they will appear in Flashcards / Quizzes / Steps
                          below first.
                        </p>
                      )}
                  </div>

                  <div className="stack" style={{ gap: "var(--space-2)" }}>
                    <span className="muted" style={{ fontSize: "0.82rem", fontWeight: 600 }}>
                      In this folder
                    </span>
                    {f.documentIds.length > 0 && (
                      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                        {f.documentIds.map((id) => {
                          const d = docById[id];
                          return (
                            <li
                              key={`doc-${id}`}
                              className="row"
                              style={{
                                justifyContent: "space-between",
                                marginTop: "4px",
                              }}
                            >
                              {d ? (
                                <Link to={`/study/${id}`}>{d.fileName}</Link>
                              ) : (
                                <span className="muted">
                                  (missing doc) {id.slice(0, 8)}…
                                </span>
                              )}
                              <button
                                type="button"
                                className="button ghost"
                                style={{ fontSize: "0.85rem" }}
                                onClick={() =>
                                  void removeDocumentFromFolder(f.id, id)
                                }
                              >
                                Remove
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    {f.deckIds.length > 0 && (
                      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                        {f.deckIds.map((id) => {
                          const deck = deckById[id];
                          return (
                            <li
                              key={`deck-${id}`}
                              className="row"
                              style={{
                                justifyContent: "space-between",
                                marginTop: "4px",
                              }}
                            >
                              <span>{deck?.title ?? `Deck ${id.slice(0, 6)}…`}</span>
                              <button
                                type="button"
                                className="button ghost"
                                style={{ fontSize: "0.85rem" }}
                                onClick={() => void removeDeckFromFolder(f.id, id)}
                              >
                                Remove
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    {f.quizIds.length > 0 && (
                      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                        {f.quizIds.map((id) => {
                          const quiz = quizById[id];
                          return (
                            <li
                              key={`quiz-${id}`}
                              className="row"
                              style={{
                                justifyContent: "space-between",
                                marginTop: "4px",
                              }}
                            >
                              <span>{quiz?.title ?? `Quiz ${id.slice(0, 6)}…`}</span>
                              <button
                                type="button"
                                className="button ghost"
                                style={{ fontSize: "0.85rem" }}
                                onClick={() => void removeQuizFromFolder(f.id, id)}
                              >
                                Remove
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    {f.stepPlanIds.length > 0 && (
                      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                        {f.stepPlanIds.map((id) => {
                          const plan = planById[id];
                          return (
                            <li
                              key={`plan-${id}`}
                              className="row"
                              style={{
                                justifyContent: "space-between",
                                marginTop: "4px",
                              }}
                            >
                              <span>{plan?.title ?? `Steps ${id.slice(0, 6)}…`}</span>
                              <button
                                type="button"
                                className="button ghost"
                                style={{ fontSize: "0.85rem" }}
                                onClick={() =>
                                  void removeStepPlanFromFolder(f.id, id)
                                }
                              >
                                Remove
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    {!hasAnything && (
                      <p className="muted" style={{ margin: 0, fontSize: "0.88rem" }}>
                        Nothing in this folder yet.
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <div className="grid-3" style={{ alignItems: "stretch" }}>
        <section className="card stack" aria-labelledby="flashcards-heading">
          <h2 id="flashcards-heading" style={{ fontSize: "1.1rem" }}>
            Flashcards
          </h2>
          <p className="muted" style={{ margin: 0 }}>
            Saved from study (Flashcards mode) or this browser in preview.
          </p>
          {decksError && (
            <p className="error-banner" role="alert" style={{ margin: 0 }}>
              {decksError}
            </p>
          )}
          {decksLoading && <p className="muted" style={{ margin: 0 }}>Loading…</p>}
          {!decksLoading && decks.length === 0 && (
            <p className="muted" style={{ margin: 0, fontSize: "0.9rem" }}>
              None yet. In <Link to="/study">Study</Link>, open a document, pick
              Flashcards mode, then <strong>Save to library</strong> on a tutor
              reply.
            </p>
          )}
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {decks.map((d) => (
              <li key={d.id}>
                <FlashcardDeckRow deck={d} onRemove={() => void removeDeck(d.id)} />
              </li>
            ))}
          </ul>
        </section>

        <section className="card stack" aria-labelledby="quizzes-heading">
          <h2 id="quizzes-heading" style={{ fontSize: "1.1rem" }}>
            Quizzes
          </h2>
          <p className="muted" style={{ margin: 0 }}>
            Saved from study (Quiz mode) or this browser in preview.
          </p>
          {quizzesError && (
            <p className="error-banner" role="alert" style={{ margin: 0 }}>
              {quizzesError}
            </p>
          )}
          {quizzesLoading && <p className="muted" style={{ margin: 0 }}>Loading…</p>}
          {!quizzesLoading && quizzes.length === 0 && (
            <p className="muted" style={{ margin: 0, fontSize: "0.9rem" }}>
              None yet. In <Link to="/study">Study</Link>, use Quiz mode, then
              <strong> Save quiz to library</strong> on a reply.
            </p>
          )}
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {quizzes.map((q) => (
              <li key={q.id}>
                <SavedQuizRow quiz={q} onRemove={() => void removeQuiz(q.id)} />
              </li>
            ))}
          </ul>
        </section>

        <section className="card stack" aria-labelledby="steps-heading">
          <h2 id="steps-heading" style={{ fontSize: "1.1rem" }}>
            Step-by-step
          </h2>
          <p className="muted" style={{ margin: 0 }}>
            Saved from study (Step-by-step mode) or this browser in preview.
          </p>
          {stepPlansError && (
            <p className="error-banner" role="alert" style={{ margin: 0 }}>
              {stepPlansError}
            </p>
          )}
          {stepPlansLoading && <p className="muted" style={{ margin: 0 }}>Loading…</p>}
          {!stepPlansLoading && stepPlans.length === 0 && (
            <p className="muted" style={{ margin: 0, fontSize: "0.9rem" }}>
              None yet. In <Link to="/study">Study</Link>, use Step-by-step mode,
              then <strong>Save step plan to library</strong> on a reply.
            </p>
          )}
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {stepPlans.map((p) => (
              <li key={p.id}>
                <SavedStepPlanRow
                  plan={p}
                  onRemove={() => void removeStepPlan(p.id)}
                />
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="stack" aria-labelledby="docs-heading">
        <header className="row" style={{ justifyContent: "space-between" }}>
          <h2 id="docs-heading" style={{ fontSize: "1.15rem", margin: 0 }}>
            All documents
          </h2>
          <span className="muted">
            {loading ? "…" : `${documents.length} file${documents.length === 1 ? "" : "s"}`}
          </span>
        </header>

        {loading ? (
          <div className="card">
            <p className="muted" style={{ margin: 0 }}>
              Loading…
            </p>
          </div>
        ) : documents.length === 0 ? (
          <div className="card stack" style={{ alignItems: "flex-start" }}>
            <strong>No files yet</strong>
            <p className="muted" style={{ margin: 0 }}>
              Upload a PDF, DOCX, or notes from the{" "}
              <Link to="/study">study workspace</Link>.
            </p>
          </div>
        ) : (
          <ul className="stack" style={{ listStyle: "none", padding: 0 }}>
            {documents.map((d) => (
              <li key={d.id}>
                <DocumentRow doc={d} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}

function DocumentRow({ doc }: { doc: StudyDocument }) {
  const linkable = doc.status !== "failed";
  return (
    <article
      className="card row"
      style={{ justifyContent: "space-between", alignItems: "flex-start" }}
    >
      <div className="stack" style={{ gap: "var(--space-1)", minWidth: 0 }}>
        <strong style={{ wordBreak: "break-word" }}>{doc.fileName}</strong>
        <div className="row" style={{ gap: "var(--space-2)" }}>
          <span className={`badge status-${doc.status}`}>
            {statusLabel(doc.status)}
          </span>
          <span className="muted">{stageLabel(doc.processingStage)}</span>
          {doc.chunkCount > 0 && (
            <span className="muted">{doc.chunkCount} chunks</span>
          )}
        </div>
        {doc.error && (
          <span className="muted" role="alert">
            {doc.error}
          </span>
        )}
      </div>
      <div className="row">
        {linkable && (
          <Link to={`/study/${doc.id}`} className="button">
            Open in study
          </Link>
        )}
      </div>
    </article>
  );
}

function FlashcardDeckRow({
  deck,
  onRemove,
}: {
  deck: FlashcardDeck;
  onRemove: () => void;
}) {
  return (
    <article
      className="card"
      style={{ marginBottom: "var(--space-2)", padding: "var(--space-3)" }}
    >
      <div
        className="row"
        style={{ justifyContent: "space-between", alignItems: "flex-start" }}
      >
        <strong>{deck.title}</strong>
        <div className="row">
          {deck.sourceDocId && (
            <Link to={`/study/${deck.sourceDocId}`} className="button secondary">
              Source
            </Link>
          )}
          <button type="button" className="button secondary" onClick={onRemove}>
            Delete
          </button>
        </div>
      </div>
      <FlashcardDeckViewer cards={deck.cards} compact />
    </article>
  );
}

function SavedStepPlanRow({
  plan,
  onRemove,
}: {
  plan: SavedStepPlan;
  onRemove: () => void;
}) {
  const steps = plan.steps ?? [];
  return (
    <article
      className="card"
      style={{ marginBottom: "var(--space-2)", padding: "var(--space-3)" }}
    >
      <div
        className="row"
        style={{ justifyContent: "space-between", alignItems: "flex-start" }}
      >
        <strong>{plan.title}</strong>
        <div className="row">
          {plan.sourceDocId && (
            <Link
              to={`/study/${plan.sourceDocId}`}
              className="button secondary"
            >
              Source
            </Link>
          )}
          <button type="button" className="button secondary" onClick={onRemove}>
            Delete
          </button>
        </div>
      </div>
      {steps.length > 0 ? (
        <StepsViewer steps={steps} compact />
      ) : (
        <details style={{ marginTop: "var(--space-2)" }}>
          <summary>View notes</summary>
          <pre
            className="muted"
            style={{
              whiteSpace: "pre-wrap",
              fontSize: "0.9rem",
              maxHeight: 220,
              overflow: "auto",
              margin: "var(--space-2) 0 0",
            }}
          >
            {plan.content}
          </pre>
        </details>
      )}
    </article>
  );
}

function SavedQuizRow({
  quiz,
  onRemove,
}: {
  quiz: SavedQuiz;
  onRemove: () => void;
}) {
  const hasStructured = (quiz.questions?.length ?? 0) > 0;
  return (
    <article
      className="card"
      style={{ marginBottom: "var(--space-2)", padding: "var(--space-3)" }}
    >
      <div
        className="row"
        style={{ justifyContent: "space-between", alignItems: "flex-start" }}
      >
        <strong>{quiz.title}</strong>
        <div className="row">
          {quiz.sourceDocId && (
            <Link
              to={`/study/${quiz.sourceDocId}`}
              className="button secondary"
            >
              Source
            </Link>
          )}
          <button type="button" className="button secondary" onClick={onRemove}>
            Delete
          </button>
        </div>
      </div>
      {hasStructured ? (
        <QuizRunner quiz={{ questions: quiz.questions ?? [] }} compact />
      ) : (
        <details style={{ marginTop: "var(--space-2)" }}>
          <summary>View</summary>
          <pre
            className="muted"
            style={{
              whiteSpace: "pre-wrap",
              fontSize: "0.9rem",
              maxHeight: 220,
              overflow: "auto",
              margin: "var(--space-2) 0 0",
            }}
          >
            {quiz.content}
          </pre>
        </details>
      )}
    </article>
  );
}

function statusLabel(status: StudyDocument["status"]) {
  switch (status) {
    case "uploaded":
      return "Uploaded";
    case "processing":
      return "Processing";
    case "ready":
      return "Ready";
    case "failed":
      return "Failed";
  }
}

function stageLabel(stage: StudyDocument["processingStage"]) {
  switch (stage) {
    case "waiting":
      return "Waiting to process";
    case "extracting_text":
      return "Extracting text";
    case "chunking":
      return "Chunking";
    case "generating_embeddings":
      return "Generating embeddings";
    case "complete":
      return "Ready to study";
    case "failed":
      return "Processing failed";
  }
}
