import { useRef, useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { ref as storageRef, uploadBytesResumable } from "firebase/storage";
import { db, firebaseConfigured, storage } from "@/lib/firebase";
import { useAuth } from "@/features/auth/AuthProvider";

const ACCEPTED = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
];

const MAX_BYTES = 25 * 1024 * 1024;

interface Props {
  /** Full card (default) or a single row for the study strip */
  variant?: "full" | "inline";
  /** Strip outer card wrapper (for nesting inside another card) */
  noCard?: boolean;
}

export function UploadDocument({ variant = "full", noCard = false }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inline = variant === "inline";

  async function onSelect(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !user) return;
    if (!firebaseConfigured) {
      setError("Add Firebase config (see README) to upload files.");
      return;
    }

    setError(null);

    if (!ACCEPTED.includes(file.type)) {
      setError("Unsupported file type. Use PDF, DOCX, TXT, or MD.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("File is larger than 25 MB.");
      return;
    }

    const docRef = doc(
      db,
      "documents",
      `${user.uid}_${Date.now()}_${cryptoRandom()}`,
    );
    const path = `users/${user.uid}/documents/${docRef.id}/original/${file.name}`;
    const fileRef = storageRef(storage, path);

    await setDoc(docRef, {
      uid: user.uid,
      fileName: file.name,
      storagePath: path,
      mimeType: file.type,
      status: "uploaded",
      processingStage: "waiting",
      chunkCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      error: null,
    });

    const upload = uploadBytesResumable(fileRef, file, {
      contentType: file.type,
      customMetadata: { uid: user.uid, docId: docRef.id },
    });

    upload.on(
      "state_changed",
      (snap) => {
        setProgress(
          Math.round((snap.bytesTransferred / snap.totalBytes) * 100),
        );
      },
      (err) => {
        setError(err.message);
        setProgress(null);
      },
      () => {
        setProgress(null);
        navigate(`/study/${docRef.id}`);
      },
    );
  }

  const body = (
    <>
      <div className="row" style={inline ? { margin: 0 } : undefined}>
        <button
          type="button"
          className={inline ? "button secondary" : "button"}
          onClick={() => inputRef.current?.click()}
          disabled={progress !== null || !firebaseConfigured || !user}
        >
          {progress !== null
            ? `Uploading ${progress}%`
            : inline
              ? "Choose file"
              : "Choose file"}
        </button>
        {!inline && (
          <span className="muted">PDF, DOCX, TXT, or Markdown. Max 25 MB.</span>
        )}
        {inline && !firebaseConfigured && (
          <span className="muted" style={{ fontSize: "0.85rem" }}>
            (requires Firebase in .env.local)
          </span>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.txt,.md,application/pdf"
          onChange={(e) => void onSelect(e)}
          style={{ display: "none" }}
        />
      </div>
      {error && (
        <div className="error-banner" role="alert">
          {error}
        </div>
      )}
    </>
  );

  if (noCard) {
    return (
      <div
        className="upload-inline"
        aria-label="Upload a study document"
        style={inline ? { display: "contents" } : undefined}
      >
        {body}
      </div>
    );
  }

  if (inline) {
    return (
      <div className="card" style={{ padding: "var(--space-3) var(--space-4)" }}>
        <h2
          className="visually-hidden"
          id={inline ? "upload-inline-h" : "upload-title"}
        >
          Add a document
        </h2>
        {body}
      </div>
    );
  }

  return (
    <div className="card stack" aria-labelledby="upload-title">
      <h2 id="upload-title" style={{ fontSize: "1.1rem" }}>
        Upload a study document
      </h2>
      <p className="muted">PDF, DOCX, TXT, or Markdown. Max 25 MB.</p>
      {body}
    </div>
  );
}

function cryptoRandom() {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
