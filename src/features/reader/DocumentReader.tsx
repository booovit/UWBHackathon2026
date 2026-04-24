import { useMemo, useRef, useState } from "react";
import type { DocumentChunk } from "@/types/document";
import { useProfile } from "@/features/profile/ProfileProvider";

interface Props {
  chunks: DocumentChunk[];
}

export function DocumentReader({ chunks }: Props) {
  const { profile } = useProfile();
  const lineFocus = profile.uiPreferences.lineFocus;
  const oneStep = profile.studyPreferences.oneStepAtATime;

  const [activeIndex, setActiveIndex] = useState(0);
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const visibleChunks = useMemo(() => {
    if (oneStep) {
      return [chunks[activeIndex]].filter(Boolean) as DocumentChunk[];
    }
    return chunks;
  }, [chunks, activeIndex, oneStep]);

  function speak(text: string, index: number) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.95;
    utter.onend = () => setSpeakingIndex(null);
    utter.onerror = () => setSpeakingIndex(null);
    utteranceRef.current = utter;
    setSpeakingIndex(index);
    window.speechSynthesis.speak(utter);
  }

  function stopSpeaking() {
    if (typeof window === "undefined") return;
    window.speechSynthesis.cancel();
    setSpeakingIndex(null);
  }

  if (chunks.length === 0) {
    return (
      <div className="card">
        <p className="muted">
          The document doesn't have any extracted chunks yet. Once processing
          finishes, the reader will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="card stack" aria-label="Document reader">
      {oneStep && (
        <div
          className="row"
          style={{ justifyContent: "space-between", flexWrap: "wrap" }}
        >
          <p className="muted" aria-live="polite">
            Step {activeIndex + 1} of {chunks.length}
          </p>
          <div className="row" style={{ gap: "var(--space-2)" }}>
            <button
              type="button"
              className="button secondary"
              onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
              disabled={activeIndex === 0}
            >
              Previous
            </button>
            <button
              type="button"
              className="button"
              onClick={() =>
                setActiveIndex((i) => Math.min(chunks.length - 1, i + 1))
              }
              disabled={activeIndex >= chunks.length - 1}
            >
              Next
            </button>
          </div>
        </div>
      )}

      <div>
        {visibleChunks.map((chunk, i) => {
          const realIndex = oneStep ? activeIndex : i;
          return (
            <article
              key={chunk.id}
              className="chunk"
              data-line-focus={lineFocus ? "true" : "false"}
              data-active={
                oneStep || speakingIndex === realIndex ? "true" : "false"
              }
            >
              {chunk.heading && <h2>{chunk.heading}</h2>}
              <p>{chunk.text}</p>
              <div className="row" style={{ gap: "var(--space-2)" }}>
                {chunk.pageNumber !== null && (
                  <span className="badge">Page {chunk.pageNumber}</span>
                )}
                <button
                  type="button"
                  className="button ghost"
                  onClick={() =>
                    speakingIndex === realIndex
                      ? stopSpeaking()
                      : speak(chunk.text, realIndex)
                  }
                >
                  {speakingIndex === realIndex ? "Stop reading" : "Read aloud"}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
