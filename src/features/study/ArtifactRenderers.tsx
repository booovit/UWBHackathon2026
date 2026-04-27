import { useMemo, useState } from "react";
import type {
  FlashcardsArtifact,
  QuizArtifact,
  StepsArtifact,
  StructuredFlashcard,
  StructuredQuizQuestion,
} from "@/types/studyArtifacts";

type TextBlock =
  | { kind: "heading"; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "list"; ordered: boolean; items: string[] };

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function cleanArtifactText(value: unknown, max = 1200): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function parseJsonFromText(content: string): unknown | null {
  const text = content.trim();
  try {
    return JSON.parse(text);
  } catch {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
    if (fenced) {
      try {
        return JSON.parse(fenced.trim());
      } catch {
        // Fall through to bracket extraction.
      }
    }
    const firstSquare = text.indexOf("[");
    const lastSquare = text.lastIndexOf("]");
    if (firstSquare !== -1 && lastSquare > firstSquare) {
      try {
        return JSON.parse(text.slice(firstSquare, lastSquare + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function unwrapArtifactArray(parsed: unknown, ...keys: string[]): unknown[] {
  if (Array.isArray(parsed)) return parsed;
  const obj = asRecord(parsed);
  if (!obj) return [];
  for (const key of keys) {
    if (Array.isArray(obj[key])) return obj[key] as unknown[];
  }
  return [];
}

function inferArtifactFromContent(
  content: string,
): { artifactType?: StructuredArtifactType; artifact?: unknown } {
  const parsed = parseJsonFromText(content);
  const items = unwrapArtifactArray(parsed, "cards", "flashcards", "questions", "quiz", "steps", "tasks", "items");
  if (items.length === 0) return {};

  const records = items.map(asRecord).filter(Boolean);
  if (records.length === 0) return {};

  const cards = records
    .map((item, index) => {
      const front = cleanArtifactText(item.front, 240);
      const back = cleanArtifactText(item.back, 1200);
      return front && back ? { id: `card-${index + 1}`, front, back } : null;
    })
    .filter(Boolean) as StructuredFlashcard[];
  if (cards.length > 0) {
    return { artifactType: "flashcards", artifact: { cards } };
  }

  const questions = records
    .map((item, index) => {
      const prompt = cleanArtifactText(item.prompt ?? item.question, 800);
      const correctAnswer = cleanArtifactText(item.correctAnswer ?? item.answer, 400);
      if (!prompt || !correctAnswer) return null;
      const options = Array.isArray(item.options)
        ? item.options.map((option) => cleanArtifactText(option, 300)).filter(Boolean)
        : undefined;
      const acceptedAnswers = Array.isArray(item.acceptedAnswers)
        ? item.acceptedAnswers.map((answer) => cleanArtifactText(answer, 200)).filter(Boolean)
        : undefined;
      return {
        id: `q-${index + 1}`,
        kind: item.kind === "mcq" || (options?.length ?? 0) >= 2 ? "mcq" : "written",
        prompt,
        options: options && options.length >= 2 ? options : undefined,
        correctAnswer,
        acceptedAnswers: acceptedAnswers && acceptedAnswers.length > 0 ? acceptedAnswers : undefined,
        explanation: cleanArtifactText(item.explanation ?? item.rationale, 900) || undefined,
      } satisfies StructuredQuizQuestion;
    })
    .filter(Boolean) as StructuredQuizQuestion[];
  if (questions.length > 0) {
    return { artifactType: "quiz", artifact: { questions } };
  }

  const steps = records
    .map((item, index) => {
      const instruction = cleanArtifactText(
        item.instruction ?? item.description ?? item.text ?? item.body,
        900,
      );
      if (!instruction) return null;
      return {
        id: `step-${index + 1}`,
        title: cleanArtifactText(item.title ?? item.heading ?? item.name, 220) || undefined,
        instruction,
      };
    })
    .filter(Boolean) as StepsArtifact["steps"];
  if (steps.length > 0) {
    return { artifactType: "steps", artifact: { steps } };
  }

  return {};
}

function cleanInlineText(value: string): string {
  return value
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/(\*\*|__)(.*?)\1/g, "$2")
    .replace(/(^|[\s([{])([*_])([^*_]+)\2(?=$|[\s,.;:!?)}\]])/g, "$1$3")
    .replace(/\s+/g, " ")
    .trim();
}

function parseTextResponse(content: string): TextBlock[] {
  const lines = content
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !/^[-*_]{3,}$/.test(line));

  const blocks: TextBlock[] = [];
  let pendingList: { ordered: boolean; items: string[] } | null = null;
  let pendingParagraph: string[] = [];

  function flushParagraph() {
    if (pendingParagraph.length === 0) return;
    blocks.push({
      kind: "paragraph",
      text: cleanInlineText(pendingParagraph.join(" ")),
    });
    pendingParagraph = [];
  }

  function flushList() {
    if (!pendingList) return;
    blocks.push({
      kind: "list",
      ordered: pendingList.ordered,
      items: pendingList.items,
    });
    pendingList = null;
  }

  for (const rawLine of lines) {
    const markdownHeading = rawLine.match(/^#{1,6}\s+(.+)$/);
    const boldHeading = rawLine.match(/^(\*\*|__)([^*_]+)\1:?$/);
    const plainHeading = rawLine.match(/^([A-Z][A-Za-z0-9 /&-]{2,42}):$/);
    const heading = markdownHeading?.[1] ?? boldHeading?.[2] ?? plainHeading?.[1];

    if (heading) {
      flushParagraph();
      flushList();
      blocks.push({ kind: "heading", text: cleanInlineText(heading) });
      continue;
    }

    const listItem = rawLine.match(/^((?:[-*•])|\d+[.)])\s+(.+)$/);
    if (listItem) {
      flushParagraph();
      const ordered = /^\d/.test(listItem[1]);
      const item = cleanInlineText(listItem[2]);
      if (!pendingList || pendingList.ordered !== ordered) {
        flushList();
        pendingList = { ordered, items: [] };
      }
      pendingList.items.push(item);
      continue;
    }

    flushList();
    pendingParagraph.push(rawLine);
  }

  flushParagraph();
  flushList();
  return blocks.filter((block) =>
    block.kind === "list" ? block.items.length > 0 : block.text.length > 0,
  );
}

export function TextResponseRenderer({ content }: { content: string }) {
  const inferred = inferArtifactFromContent(content);
  if (inferred.artifactType) {
    return (
      <ArtifactMessageRenderer
        artifactType={inferred.artifactType}
        artifact={inferred.artifact}
        compact
      />
    );
  }

  const blocks = parseTextResponse(content);

  if (blocks.length === 0) {
    return <span className="message-content">{cleanInlineText(content)}</span>;
  }

  return (
    <div className="study-response message-content">
      {blocks.map((block, index) => {
        if (block.kind === "heading") {
          return (
            <h3 key={`${block.kind}-${index}`} className="study-response-heading">
              {block.text}
            </h3>
          );
        }
        if (block.kind === "list") {
          const ListTag = block.ordered ? "ol" : "ul";
          return (
            <ListTag key={`${block.kind}-${index}`} className="study-response-list">
              {block.items.map((item, itemIndex) => (
                <li key={`${item}-${itemIndex}`}>{item}</li>
              ))}
            </ListTag>
          );
        }
        return <p key={`${block.kind}-${index}`}>{block.text}</p>;
      })}
    </div>
  );
}

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
  "is", "are", "was", "were", "be", "been", "being", "use", "uses", "used",
  "of", "to", "in", "on", "at", "for", "from", "with",
  "and", "or", "but",
  "that", "this", "these", "those", "it", "its",
  "answer", "answers", "include", "includes", "including", "possible",
  "acceptable", "example", "examples",
]);

const EQUIVALENT_TERMS: string[][] = [
  ["make", "makes", "making", "produce", "produces", "producing", "create", "creates", "creating", "convert", "converts", "converting", "form", "forms", "forming"],
  ["food", "glucose", "sugar", "sugars", "carbohydrate", "carbohydrates", "chemical", "energy"],
  ["plant", "plants", "algae", "bacteria", "organism", "organisms", "autotroph", "autotrophs"],
  ["sunlight", "light", "solar"],
  ["carbon", "dioxide", "co2"],
  ["oxygen", "o2"],
  ["water", "h2o"],
  ["cause", "causes", "reason", "reasons", "factor", "factors"],
  ["effect", "effects", "result", "results", "outcome", "outcomes"],
  ["important", "significant", "key", "main", "major"],
  ["increase", "increases", "increased", "rise", "rises", "rose", "growth", "grow", "grows"],
  ["decrease", "decreases", "decreased", "fall", "falls", "fell", "decline", "declines"],
];

function stemToken(token: string): string {
  if (token.length > 5 && token.endsWith("ing")) return token.slice(0, -3);
  if (token.length > 4 && token.endsWith("ies")) return `${token.slice(0, -3)}y`;
  if (token.length > 4 && token.endsWith("ed")) return token.slice(0, -2);
  if (token.length > 3 && token.endsWith("s")) return token.slice(0, -1);
  return token;
}

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
    .map(stemToken)
    .filter((tok) => tok && !STOP_WORDS.has(tok));
}

function expandedTokenSet(value: string): Set<string> {
  const baseTokens = tokenize(value);
  const expanded = new Set(baseTokens);
  for (const token of baseTokens) {
    for (const group of EQUIVALENT_TERMS) {
      const normalizedGroup = group.map(stemToken);
      if (normalizedGroup.includes(token)) {
        normalizedGroup.forEach((term) => expanded.add(term));
      }
    }
  }
  return expanded;
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
  const userSet = expandedTokenSet(user);
  const targetSet = expandedTokenSet(target);
  const overlap = targetTokens.filter((tok) => userSet.has(tok));
  const recall = overlap.length / targetTokens.length;
  const userOverlap = userTokens.filter((tok) => targetSet.has(tok));
  const precision = userTokens.length ? userOverlap.length / userTokens.length : 0;

  // All key tokens covered and answer not absurdly padded → accept.
  if (recall === 1 && userTokens.length <= targetTokens.length * 4) {
    return true;
  }
  if (targetTokens.length <= 6 && recall >= 0.6 && userTokens.length >= targetTokens.length) {
    return true;
  }
  if (targetTokens.length <= 4 && overlap.length >= 2 && userTokens.length >= targetTokens.length) {
    return true;
  }
  if (recall + precision === 0) return false;
  const f1 = (2 * recall * precision) / (recall + precision);
  return f1 >= 0.7;
}

function extractAnswerOptions(value: string): string[] {
  const withoutPrefix = value
    .replace(
      /^(?:possible|acceptable|correct)?\s*(?:answers?|responses?)\s+(?:can\s+)?(?:include|includes|are|is)\s*:?\s*/i,
      "",
    )
    .replace(/^(?:any\s+of|examples?\s+include|such\s+as)\s*:?\s*/i, "")
    .replace(/[.!?]+$/g, "")
    .trim();

  if (!withoutPrefix) return [];

  return withoutPrefix
    .split(/\s*(?:,|;|\/|\bor\b|\band\b)\s*/i)
    .map((part) => part.replace(/^[\s"'(]+|[\s"')]+$/g, "").trim())
    .filter((part) => tokenize(part).length > 0);
}

function buildAnswerPool(question: StructuredQuizQuestion): string[] {
  const rawAnswers = [
    question.correctAnswer,
    ...(question.acceptedAnswers ?? []),
  ];
  const expanded = rawAnswers.flatMap((answer) => [
    answer,
    ...extractAnswerOptions(answer),
  ]);
  return Array.from(new Set(expanded.map((answer) => answer.trim()).filter(Boolean)));
}

function conceptPoolMatch(user: string, pool: string[]): boolean {
  const userTokens = tokenize(user);
  if (userTokens.length === 0) return false;

  const conceptTokenSet = new Set(
    pool.flatMap((answer) => tokenize(answer)),
  );
  if (conceptTokenSet.size === 0) return false;

  return userTokens.every((token) => conceptTokenSet.has(token));
}

function isQuestionCorrect(question: StructuredQuizQuestion, input: string): boolean {
  if (!input.trim()) return false;
  if (question.kind === "mcq") {
    return normalizeAnswer(input) === normalizeAnswer(question.correctAnswer);
  }
  const pool = buildAnswerPool(question);
  return (
    pool.some((candidate) => fuzzyMatch(input, candidate)) ||
    conceptPoolMatch(input, pool)
  );
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
  const [showResults, setShowResults] = useState(false);
  const current = quiz.questions[index];
  const questionResults = useMemo(
    () =>
      quiz.questions.map((question) => {
        const answer = answers[question.id] ?? "";
        const wasChecked = Boolean(checked[question.id]);
        return {
          question,
          answer,
          wasChecked,
          correct: wasChecked && isQuestionCorrect(question, answer),
        };
      }),
    [answers, checked, quiz.questions],
  );
  const score = useMemo(
    () => questionResults.reduce((sum, result) => sum + (result.correct ? 1 : 0), 0),
    [questionResults],
  );
  const total = quiz.questions.length;
  const percent = total > 0 ? Math.round((score / total) * 100) : 0;

  if (!current) return null;
  const chosen = answers[current.id] ?? "";
  const hasChecked = Boolean(checked[current.id]);
  const correct = hasChecked && isQuestionCorrect(current, chosen);
  const isLastQuestion = index >= quiz.questions.length - 1;

  if (showResults) {
    return (
      <div className="stack" style={{ gap: "var(--space-3)" }}>
        <div className="card stack" style={{ padding: compact ? "var(--space-3)" : undefined }}>
          <span className="muted">Quiz complete</span>
          <strong style={{ fontSize: "1.35rem" }}>
            Score {score} / {total} ({percent}%)
          </strong>
          <p style={{ margin: 0 }}>
            {percent >= 80
              ? "Great work. You understood most of this quiz."
              : percent >= 60
                ? "Good progress. Review the missed questions below."
                : "Keep practicing. The review below shows what to focus on next."}
          </p>
        </div>

        <div className="stack" style={{ gap: "var(--space-2)" }}>
          {questionResults.map((result, resultIndex) => (
            <div
              key={result.question.id}
              className={result.correct ? "info-banner" : "error-banner"}
              role="group"
              aria-label={`Question ${resultIndex + 1} review`}
            >
              <strong>
                {resultIndex + 1}. {result.question.prompt}
              </strong>
              <p style={{ margin: "var(--space-1) 0 0" }}>
                Your answer: {result.answer.trim() || "No answer"}
              </p>
              <p style={{ margin: "var(--space-1) 0 0" }}>
                Correct answer: <strong>{result.question.correctAnswer}</strong>
              </p>
              {result.question.explanation && (
                <p style={{ margin: "var(--space-1) 0 0" }}>
                  {result.question.explanation}
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="row" style={{ justifyContent: "space-between" }}>
          <button
            type="button"
            className="button secondary"
            onClick={() => {
              setShowResults(false);
              setIndex(0);
            }}
          >
            Review questions
          </button>
          <button
            type="button"
            className="button"
            onClick={() => {
              setAnswers({});
              setChecked({});
              setIndex(0);
              setShowResults(false);
            }}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

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
          className={isLastQuestion ? "button" : "button secondary"}
          onClick={() => {
            if (isLastQuestion) {
              setShowResults(true);
              return;
            }
            setIndex((i) => Math.min(quiz.questions.length - 1, i + 1));
          }}
          disabled={!hasChecked}
        >
          {isLastQuestion ? "View results" : "Next"}
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
