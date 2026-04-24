import { Link, Navigate } from "react-router-dom";
import { UploadDocument } from "@/features/documents/UploadDocument";
import { useDocuments } from "@/features/documents/useDocuments";
import { useProfile } from "@/features/profile/ProfileProvider";
import type { StudyDocument } from "@/types/document";

export function DashboardPage() {
  const { documents, loading } = useDocuments();
  const { profile, loading: profileLoading } = useProfile();

  if (!profileLoading && !profile.onboardingComplete) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <section className="stack" aria-labelledby="dashboard-title">
      <header className="stack" style={{ gap: "var(--space-2)" }}>
        <h1 id="dashboard-title">Your documents</h1>
        <p className="muted">
          Upload a document to get an adaptive reader, document-grounded chat,
          and study tools tuned to your profile.
        </p>
      </header>

      <UploadDocument />

      {loading ? (
        <p>Loading…</p>
      ) : documents.length === 0 ? (
        <div className="card">
          <p className="muted">
            No documents yet. Upload your first PDF, DOCX, TXT, or Markdown
            file above.
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
  );
}

function DocumentRow({ doc }: { doc: StudyDocument }) {
  const linkable = doc.status !== "failed";
  return (
    <article className="card row" style={{ justifyContent: "space-between" }}>
      <div className="stack" style={{ gap: "var(--space-1)" }}>
        <strong>{doc.fileName}</strong>
        <div className="row" style={{ gap: "var(--space-2)" }}>
          <span className={`badge status-${doc.status}`}>{statusLabel(doc.status)}</span>
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
          <Link to={`/documents/${doc.id}`} className="button">
            Open
          </Link>
        )}
      </div>
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
