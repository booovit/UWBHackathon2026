import { useMemo, useState } from "react";
import type {
  FlashcardsArtifact,
  QuizArtifact,
  StepsArtifact,
  StructuredFlashcard,
  StructuredQuizQuestion,
} from "@/types/studyArtifacts";

export function FlashcardDeckViewer({
  cards,
  compact,
}: {
  cards: StructuredFlashcard[];
  compact?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const active = cards[index];
  if (!active) return null;
  const isOpen = Boolean(revealed[active.id]);

  return (
    <div className="stack" style={{ gap: "var(--space-2)" }}>
      <button
        type="button"
        className="card"
        style={{
          textAlign: "left",
          width: "100%",
          cursor: "pointer",
          padding: compact ? "var(--space-3)" : "var(--space-4)",
        }}
        aria-expanded={isOpen}
        onClick={() =>
          setRevealed((prev) => ({ ...prev, [active.id]: !prev[active.id] }))
        }
      >
        <strong style={{ display: "block", marginBottom: "var(--space-2)" }}>
          {active.front}
        </strong>
        <span className="muted" style={{ fontSize: "0.9rem" }}>
          {isOpen ? active.back : "Click to reveal answer"}
        </span>
      </button>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <button
          type="button"
          className="button secondary"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
        >
          Previous
        </button>
        <span className="muted" aria-live="polite">
          Card {index + 1} of {cards.length}
        </span>
        <button
          type="button"
          className="button secondary"
          onClick={() => setIndex((i) => Math.min(cards.length - 1, i + 1))}
          disabled={index >= cards.length - 1}
        >
          Next
        </button>
      </div>
    </div>
  );
}

const STOP_WORDS = new Set([
  "a", "an", "the",
  "is", "are", "was", "were", "be", "been", "being",
  "of", "to", "in", "on", "at", "for", "from", "with",
  "and", "or", "but",
  "that", "this", "these", "those", "it", "its",
]);

function normalizeAnswer(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value: string): string[] {
  return normalizeAnswer(value)
    .split(" ")
    .filter((tok) => tok && !STOP_WORDS.has(tok));
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const dp: number[] = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) dp[j] = j;
  for (let i = 1; i <= a.length; i++) {
    let prev = i - 1;
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = tmp;
    }
  }
  return dp[b.length];
}

function fuzzyMatch(user: string, target: string): boolean {
  const u = normalizeAnswer(user);
  const t = normalizeAnswer(target);
  if (!u || !t) return false;
  if (u === t) return true;

  // Typo tolerance for short answers (≤ ~20% character distance).
  const distance = levenshtein(u, t);
  const maxLen = Math.max(u.length, t.length);
  if (maxLen <= 4) {
    if (distance <= 1) return true;
  } else if (distance / maxLen <= 0.2) {
    return true;
  }

  // Token overlap for longer / multi-word answers.
  const userTokens = tokenize(user);
  const targetTokens = tokenize(target);
  if (targetTokens.length === 0) return false;
  const targetSet = new Set(targetTokens);
  const overlap = userTokens.filter((tok) => targetSet.has(tok));
  const recall = overlap.length / targetTokens.length;
  const precision = userTokens.length ? overlap.length / userTokens.length : 0;

  // All key tokens covered and answer not absurdly padded → accept.
  if (recall === 1 && userTokens.length <= targetTokens.length * 4) {
    return true;
  }
  if (recall + precision === 0) return false;
  const f1 = (2 * recall * precision) / (recall + precision);
  return f1 >= 0.7;
}

function isQuestionCorrect(question: StructuredQuizQuestion, input: string): boolean {
  if (!input.trim()) return false;
  if (question.kind === "mcq") {
    return normalizeAnswer(input) === normalizeAnswer(question.correctAnswer);
  }
  const pool = [question.correctAnswer, ...(question.acceptedAnswers ?? [])];
  return pool.some((candidate) => fuzzyMatch(input, candidate));
}

export function QuizRunner({
  quiz,
  compact,
}: {
  quiz: QuizArtifact;
  compact?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const current = quiz.questions[index];
  const score = useMemo(
    () =>
      quiz.questions.reduce((sum, q) => {
        if (!checked[q.id]) return sum;
        return sum + (isQuestionCorrect(q, answers[q.id] ?? "") ? 1 : 0);
      }, 0),
    [answers, checked, quiz.questions],
  );

  if (!current) return null;
  const chosen = answers[current.id] ?? "";
  const hasChecked = Boolean(checked[current.id]);
  const correct = hasChecked && isQuestionCorrect(current, chosen);

  return (
    <div className="stack" style={{ gap: "var(--space-2)" }}>
      <div className="muted" aria-live="polite">
        Question {index + 1} of {quiz.questions.length} · Score {score}/
        {quiz.questions.length}
      </div>
      <div className="card stack" style={{ padding: compact ? "var(--space-3)" : undefined }}>
        <strong>{current.prompt}</strong>
        {current.kind === "mcq" ? (
          <div className="stack" style={{ gap: "var(--space-2)" }}>
            {(current.options ?? []).map((option) => (
              <button
                type="button"
                key={option}
                className={
                  chosen === option ? "button" : "button secondary"
                }
                onClick={() => setAnswers((prev) => ({ ...prev, [current.id]: option }))}
                disabled={hasChecked}
              >
                {option}
              </button>
            ))}
          </div>
        ) : (
          <textarea
            aria-label="Your answer"
            value={chosen}
            onChange={(e) =>
              setAnswers((prev) => ({ ...prev, [current.id]: e.target.value }))
            }
            rows={3}
            disabled={hasChecked}
          />
        )}
        {!hasChecked ? (
          <button
            type="button"
            className="button"
            onClick={() => setChecked((prev) => ({ ...prev, [current.id]: true }))}
            disabled={!chosen.trim()}
          >
            Check answer
          </button>
        ) : (
          <div
            className={correct ? "info-banner" : "error-banner"}
            role="status"
          >
            {correct ? "Correct." : "Not quite yet."} Answer:{" "}
            <strong>{current.correctAnswer}</strong>
            {current.explanation ? ` — ${current.explanation}` : ""}
          </div>
        )}
      </div>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <button
          type="button"
          className="button secondary"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
        >
          Previous
        </button>
        <button
          type="button"
          className="button secondary"
          onClick={() => setIndex((i) => Math.min(quiz.questions.length - 1, i + 1))}
          disabled={index >= quiz.questions.length - 1}
        >
          Next
        </button>
      </div>
    </div>
  );
}

export function StepsViewer({
  steps,
  compact,
}: {
  steps: StepsArtifact["steps"];
  compact?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [done, setDone] = useState<Record<string, boolean>>({});
  const current = steps[index];
  if (!current) return null;
  const completeCount = Object.values(done).filter(Boolean).length;

  return (
    <div className="stack" style={{ gap: "var(--space-2)" }}>
      <div className="muted" aria-live="polite">
        Task {index + 1} of {steps.length} · Completed {completeCount}/{steps.length}
      </div>
      <div className="card stack" style={{ padding: compact ? "var(--space-3)" : undefined }}>
        {current.title && <strong>{current.title}</strong>}
        <p style={{ margin: 0 }}>{current.instruction}</p>
        <button
          type="button"
          className={done[current.id] ? "button secondary" : "button"}
          aria-pressed={Boolean(done[current.id])}
          onClick={() =>
            setDone((prev) => ({
              ...prev,
              [current.id]: !prev[current.id],
            }))
          }
        >
          {done[current.id] ? "Marked complete" : "Mark complete"}
        </button>
      </div>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <button
          type="button"
          className="button secondary"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
        >
          Previous
        </button>
        <button
          type="button"
          className="button secondary"
          onClick={() => setIndex((i) => Math.min(steps.length - 1, i + 1))}
          disabled={index >= steps.length - 1}
        >
          Next
        </button>
      </div>
    </div>
  );
}

export function ArtifactMessageRenderer({
  artifactType,
  artifact,
  compact,
}: {
  artifactType?: string;
  artifact?: unknown;
  compact?: boolean;
}) {
  if (artifactType === "flashcards") {
    const cards = (artifact as FlashcardsArtifact | undefined)?.cards ?? [];
    return cards.length > 0 ? <FlashcardDeckViewer cards={cards} compact={compact} /> : null;
  }
  if (artifactType === "quiz") {
    const questions = (artifact as QuizArtifact | undefined)?.questions ?? [];
    return questions.length > 0 ? (
      <QuizRunner quiz={{ questions }} compact={compact} />
    ) : null;
  }
  if (artifactType === "steps") {
    const steps = (artifact as StepsArtifact | undefined)?.steps ?? [];
    return steps.length > 0 ? <StepsViewer steps={steps} compact={compact} /> : null;
  }
  return null;
}
