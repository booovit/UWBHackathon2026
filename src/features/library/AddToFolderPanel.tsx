import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { firebaseConfigured } from "@/lib/firebase";
import { useStudyFolders } from "@/features/library/useStudyFolders";

interface Props {
  documentId: string;
  documentTitle?: string;
}

export function AddToFolderPanel({ documentId, documentTitle }: Props) {
  const {
    folders,
    loading,
    createFolder,
    addDocumentToFolder,
  } = useStudyFolders();
  const [newFolderName, setNewFolderName] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState("");
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  const foldersWithoutDoc = useMemo(
    () => folders.filter((f) => !f.documentIds.includes(documentId)),
    [folders, documentId],
  );

  const allHaveDoc =
    folders.length > 0 && foldersWithoutDoc.length === 0;

  async function onAddToSelected() {
    if (!selectedFolderId) return;
    setBusy(true);
    setHint(null);
    try {
      await addDocumentToFolder(selectedFolderId, documentId);
      setSelectedFolderId("");
      setHint(
        `“${documentTitle ?? "This document"}” was added to the folder.`,
      );
      window.setTimeout(() => setHint(null), 4000);
    } finally {
      setBusy(false);
    }
  }

  async function onCreateAndAdd() {
    const name = newFolderName.trim();
    if (!name) return;
    setBusy(true);
    setHint(null);
    try {
      const id = await createFolder(name);
      if (id) {
        await addDocumentToFolder(id, documentId);
        setNewFolderName("");
        setHint(`Created “${name}” and added this document.`);
        window.setTimeout(() => setHint(null), 5000);
      }
    } finally {
      setBusy(false);
    }
  }

  if (!firebaseConfigured) {
    return (
      <div className="card stack" style={{ gap: "var(--space-2)" }}>
        <p className="muted" style={{ margin: 0, fontSize: "0.9rem" }}>
          <strong>Folders</strong> need Firebase. Add <code>.env.local</code>, then
          organize documents from <Link to="/dashboard">Library</Link>.
        </p>
      </div>
    );
  }

  return (
    <div className="card stack" style={{ gap: "var(--space-3)" }}>
      <div>
        <h2 style={{ fontSize: "1rem", margin: 0 }}>Folders</h2>
        <p className="muted" style={{ margin: "var(--space-1) 0 0", fontSize: "0.9rem" }}>
          Add this file to a folder for quicker access from your library.
        </p>
      </div>

      {loading && <p className="muted" style={{ margin: 0 }}>Loading folders…</p>}

      {!loading && folders.length === 0 && (
        <p className="muted" style={{ margin: 0, fontSize: "0.9rem" }}>
          You don&apos;t have any folders yet. Create one below — this document
          will be added automatically.
        </p>
      )}

      {!loading && folders.length > 0 && (
        <div className="row" style={{ flexWrap: "wrap", alignItems: "flex-end" }}>
          <div className="stack" style={{ gap: "var(--space-1)", minWidth: "12rem", flex: "1 1 200px" }}>
            <label htmlFor="add-doc-folder-select" className="muted" style={{ fontSize: "0.85rem" }}>
              Add to existing folder
            </label>
            <select
              id="add-doc-folder-select"
              value={selectedFolderId}
              onChange={(e) => setSelectedFolderId(e.target.value)}
              disabled={allHaveDoc || busy}
            >
              <option value="">— Choose folder —</option>
              {foldersWithoutDoc.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="button"
            disabled={!selectedFolderId || busy || allHaveDoc}
            onClick={() => void onAddToSelected()}
          >
            {busy ? "…" : "Add to folder"}
          </button>
        </div>
      )}

      {allHaveDoc && (
        <p className="muted" style={{ margin: 0, fontSize: "0.88rem" }}>
          This document is already in every folder. Create a new folder below if
          you want another group.
        </p>
      )}

      <div
        className="stack"
        style={{
          gap: "var(--space-2)",
          paddingTop: "var(--space-2)",
          borderTop: "1px solid var(--color-border)",
        }}
      >
        <span className="muted" style={{ fontSize: "0.85rem" }}>
          New folder + add this document
        </span>
        <div className="row" style={{ flexWrap: "wrap" }}>
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="e.g. Midterm unit"
            aria-label="New folder name"
            style={{ flex: "1 1 12rem", minWidth: 0 }}
          />
          <button
            type="button"
            className="button secondary"
            disabled={!newFolderName.trim() || busy}
            onClick={() => void onCreateAndAdd()}
          >
            {busy ? "…" : "Create & add"}
          </button>
        </div>
      </div>

      {hint && (
        <p className="info-banner" role="status" style={{ margin: 0 }}>
          {hint}
        </p>
      )}

      <p className="muted" style={{ margin: 0, fontSize: "0.82rem" }}>
        Manage all folders on{" "}
        <Link to="/dashboard">Library</Link> (flashcards, quizzes, and steps too).
      </p>
    </div>
  );
}
