import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useDocuments } from "@/features/documents/useDocuments";
import { UploadDocument } from "@/features/documents/UploadDocument";
import { useAuth } from "@/features/auth/AuthProvider";
import { firebaseConfigured } from "@/lib/firebase";

export function StudyPage() {
  const { docId } = useParams<{ docId?: string }>();
  const { documents, loading } = useDocuments();
  const { isGuest } = useAuth();
  const [showUpload, setShowUpload] = useState(false);

  const currentDoc = docId
    ? documents.find((d) => d.id === docId)
    : null;

  return (
    <section className="stack" aria-labelledby="study-title">
      <header className="stack" style={{ gap: "var(--space-2)" }}>
        <h1 id="study-title">Study Workspace</h1>
        <p className="muted">
          Upload documents, ask questions, and use AI-powered study tools.
        </p>
      </header>

      {!firebaseConfigured && (
        <div className="info-banner" role="status">
          <strong>Preview mode.</strong> Add <code>.env.local</code> with
          Firebase config to enable full functionality.
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
              Sign in to save your study sessions.
            </p>
          </div>
          <Link to="/login" className="button">
            Sign in
          </Link>
        </div>
      )}

      <div className="row" style={{ gap: "var(--space-2)", flexWrap: "wrap" }}>
        <button
          type="button"
          className="button"
          onClick={() => setShowUpload(!showUpload)}
        >
          {showUpload ? "Cancel" : "Upload Document"}
        </button>
        <Link to="/dashboard" className="button secondary">
          View Library
        </Link>
      </div>

      {showUpload && (
        <div className="card">
          <UploadDocument onSuccess={() => setShowUpload(false)} />
        </div>
      )}

      {currentDoc ? (
        <div className="card stack">
          <h2>Studying: {currentDoc.fileName}</h2>
          <p className="muted">Status: {currentDoc.status}</p>
          <div className="chat-placeholder card" style={{ minHeight: "300px" }}>
            <p className="muted" style={{ textAlign: "center", padding: "var(--space-4)" }}>
              Chat interface coming soon. Ask questions about your document here.
            </p>
          </div>
        </div>
      ) : (
        <div className="card stack">
          <h2>Select a document</h2>
          {loading ? (
            <p className="muted">Loading documents...</p>
          ) : documents.length === 0 ? (
            <p className="muted">
              No documents yet. Upload one to get started.
            </p>
          ) : (
            <ul className="stack" style={{ listStyle: "none", padding: 0 }}>
              {documents.map((doc) => (
                <li key={doc.id}>
                  <Link
                    to={`/study/${doc.id}`}
                    className="card row"
                    style={{ justifyContent: "space-between", textDecoration: "none" }}
                  >
                    <span>{doc.fileName}</span>
                    <span className="badge">{doc.status}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
