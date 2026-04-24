import { useRef, useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  doc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { ref as storageRef, uploadBytesResumable } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useAuth } from "@/features/auth/AuthProvider";

const ACCEPTED = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
];

const MAX_BYTES = 25 * 1024 * 1024;

export function UploadDocument() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSelect(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !user) return;

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
        setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100));
      },
      (err) => {
        setError(err.message);
        setProgress(null);
      },
      () => {
        setProgress(null);
        navigate(`/documents/${docRef.id}`);
      },
    );
  }

  return (
    <div className="card stack" aria-labelledby="upload-title">
      <h2 id="upload-title" style={{ fontSize: "1.1rem" }}>
        Upload a study document
      </h2>
      <p className="muted">PDF, DOCX, TXT, or Markdown. Max 25 MB.</p>
      <div className="row">
        <button
          type="button"
          className="button"
          onClick={() => inputRef.current?.click()}
          disabled={progress !== null}
        >
          {progress !== null ? `Uploading ${progress}%` : "Choose file"}
        </button>
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
    </div>
  );
}

function cryptoRandom() {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
