# Studylift — Accessibility-first AI study platform

Studylift turns uploaded study materials (PDF, DOCX, TXT, MD) into a personalized reading and study experience. Students pick the supports they need (dyslexia, ADHD/executive function, low vision), and the same document becomes:

- An adaptive reader with text size, spacing, line focus, and high-contrast controls.
- A document-grounded Gemini tutor (chat, simplify, summary, quiz, flashcards, step-by-step).
- A profile that learns from feedback over time, while always letting the user override.

The full product blueprint lives in [`ACCESSIBILITY_AI_STUDY_PLATFORM_PLAN.md`](./ACCESSIBILITY_AI_STUDY_PLATFORM_PLAN.md).

---

## Quickstart

Just want to see the UI?

```bash
nvm use 20            # or install Node 20
npm ci
npm run dev
```

Open the printed `http://localhost:5173` URL. The landing page, sign-in form, onboarding form, dashboard, reader, and chat panel will all render. Anything that calls Firebase (sign-in, upload, chat) will fail until you complete [Firebase setup](#one-time-firebase-setup) and add `.env.local`.

Want the full backend pipeline locally? Skip to [Run the full backend with emulators](#run-the-full-backend-with-emulators).

---

## Tech stack & pinned versions

`package-lock.json` and `functions/package-lock.json` are committed — use `npm ci` so every collaborator installs the exact same tree.

| Tool / Package                | Version  |
| ----------------------------- | -------- |
| Node.js                       | 20 LTS   |
| npm                           | >= 10    |
| react                         | 19.2.5   |
| react-dom                     | 19.2.5   |
| react-router-dom              | latest   |
| firebase (web SDK)            | 12.12.1  |
| vite                          | 8.0.10   |
| typescript                    | 5.x      |
| firebase-functions            | 6.x      |
| firebase-admin                | 13.x     |
| @google/genai                 | 1.50.x   |
| pdf-parse                     | 1.1.x    |
| mammoth                       | 1.12.x   |

Cloud Functions target Node 20. Use `nvm use 20` if your local version is different.

---

## Prerequisites

1. **Node 20 LTS.**
   ```bash
   nvm install 20
   nvm use 20
   ```
2. **Firebase CLI.**
   ```bash
   npm install -g firebase-tools
   firebase login
   ```
3. **A Firebase project** on the **Blaze** plan. Vector search and Cloud Functions both require Blaze. Get one at [console.firebase.google.com](https://console.firebase.google.com).
4. **A Gemini API key** from [Google AI Studio](https://aistudio.google.com/app/apikey).

---

## One-time Firebase setup

1. **Create a web app** in the Firebase console. Copy the config — you'll paste it into `.env.local` below.
2. **Enable services** in the console:
   - Authentication → Sign-in methods → enable **Email/Password** and **Google**.
   - Firestore Database → create a Native-mode database.
   - Storage → enable.
3. **Link the Firebase CLI to your project.**
   ```bash
   firebase use --add
   ```
   Pick your project, give it the alias `default`. This populates `.firebaserc`.
4. **Set the Gemini API key as a secret.**
   ```bash
   firebase functions:secrets:set GEMINI_API_KEY
   ```
   Paste your key when prompted.
5. **Deploy rules and the vector index.**
   ```bash
   firebase deploy --only firestore:rules,storage:rules,firestore:indexes
   ```
   The vector index can take several minutes to build the first time.

---

## Local install

```bash
git clone https://github.com/<org>/UWBHackathon2026.git
cd UWBHackathon2026
npm ci
npm --prefix functions ci
```

### Configure environment

```bash
cp .env.example .env.local
cp functions/.secret.local.example functions/.secret.local
```

Fill in the values:

- `.env.local` — your Firebase web config (the `VITE_FIREBASE_*` values from the console). This is **not** the Gemini key.
- `functions/.secret.local` — your `GEMINI_API_KEY` for local Functions emulator runs only.

Both files are gitignored.

### Run the frontend

```bash
npm run dev          # vite dev server at http://localhost:5173
npm run build        # production build to ./dist
npm run preview      # preview the build
```

### Run the full backend with emulators

In a separate terminal:

```bash
firebase emulators:start
```

Then start Vite with emulators enabled:

```bash
VITE_USE_EMULATORS=true npm run dev
```

Or set `VITE_USE_EMULATORS=true` in `.env.local`.

The emulator UI runs at <http://localhost:4000>.

> **Note:** the Firestore vector search emulator falls back to ordered-chunk retrieval (the function gracefully degrades), but real semantic search only runs against the deployed Firestore instance.

---

## Deploy

```bash
npm run build
firebase deploy
```

This deploys hosting, Functions, Firestore rules + indexes, and Storage rules.

---

## Project structure

```
.
├── README.md
├── ACCESSIBILITY_AI_STUDY_PLATFORM_PLAN.md   # full product/architecture plan
├── firebase.json                             # Firebase project config
├── firestore.rules
├── firestore.indexes.json                    # includes vector index for chunk embeddings
├── storage.rules
├── package.json                              # frontend deps
├── tsconfig.*.json
├── vite.config.ts
├── index.html
├── .env.example
├── src/                                      # React + TypeScript frontend
│   ├── main.tsx                              # entry, providers, router
│   ├── app/App.tsx                           # routes + accessible app shell
│   ├── lib/firebase.ts                       # firebase web SDK init + emulators
│   ├── lib/functions.ts                      # callable function wrappers
│   ├── types/                                # shared TS types
│   ├── styles/globals.css                    # accessible design tokens, themes
│   ├── features/auth/                        # AuthProvider, ProtectedRoute
│   ├── features/profile/                     # ProfileProvider, PreferenceForm, applyAccessibility
│   ├── features/documents/                   # upload, document/chunk hooks
│   ├── features/reader/                      # AccessibilityToolbar, DocumentReader
│   ├── features/study/                       # ChatPanel + study modes
│   └── routes/                               # Landing, Login, Onboarding, Dashboard, Document, Settings
└── functions/                                # Firebase Cloud Functions (TypeScript)
    ├── package.json
    ├── tsconfig.json
    ├── .secret.local.example                 # template for GEMINI_API_KEY (local dev only)
    └── src/
        ├── index.ts                          # exports onDocumentUploaded, chatWithDocument, retryDocumentProcessing, saveFeedback
        ├── firebaseAdmin.ts
        ├── geminiClient.ts                   # @google/genai client + secret binding
        ├── documentProcessor.ts              # storage trigger pipeline
        ├── extractors/{pdf,docx}.ts
        ├── chunking.ts
        ├── embeddings.ts                     # gemini-embedding-001 (768-d)
        ├── retrieval.ts                      # Firestore vector search
        ├── prompts.ts                        # accessibility-aware prompt builders
        ├── chat.ts                           # callable chatWithDocument
        └── profileFeedback.ts                # callable saveFeedback
```

---

## How it works (data flow)

1. User signs up → Firebase Auth.
2. User completes onboarding → profile saved at `users/{uid}/profile/main`.
3. User uploads a document → file goes to Storage at `users/{uid}/documents/{docId}/original/...`, metadata at `documents/{docId}`.
4. Storage trigger `onDocumentUploaded` fires → extracts text (pdf-parse / mammoth / plain), chunks it, embeds each chunk with Gemini (`gemini-embedding-001`, 768-d), writes chunks to `documents/{docId}/chunks/*`, marks the document `ready`.
5. User opens the document → reader renders chunks with adaptive accessibility settings; chat panel sends messages to `chatWithDocument`.
6. `chatWithDocument` validates auth + ownership, embeds the query, runs Firestore vector search filtered to the document, builds a profile-aware prompt, calls `gemini-2.5-flash`, saves user + assistant messages with citations.
7. Feedback (`saveFeedback`) writes to `documents/{docId}/feedback/*` and updates `feedbackSignals` on the profile, while preserving manual override.

---

## Where API keys live

| Secret                           | Where                              | Used by              |
| -------------------------------- | ---------------------------------- | -------------------- |
| `VITE_FIREBASE_*`                | `.env.local` (root)                | Frontend (browser)   |
| `GEMINI_API_KEY` (deployed)      | Firebase Secret Manager            | Cloud Functions only |
| `GEMINI_API_KEY` (local dev)     | `functions/.secret.local`          | Functions emulator   |

The Gemini key is **never** exposed to the browser. Only Cloud Functions that explicitly bind `secrets: [geminiApiKey]` can read it.

---

## Adding dependencies

When you add or upgrade a package:

```bash
npm install <pkg>                      # frontend
npm --prefix functions install <pkg>   # backend
```

Commit both `package.json` files **and** their `package-lock.json` files so collaborators pick up the change with `npm ci`.

---

## Team handoff

The repo is split into clean tracks so the team can divide work:

- **Frontend foundation** — `src/main.tsx`, `src/app/`, `src/lib/`, `src/styles/`, routing.
- **Accessibility UX** — `src/features/profile/`, `src/features/reader/`, `src/styles/globals.css`.
- **Firebase backend** — `functions/src/documentProcessor.ts`, `functions/src/extractors/`, `functions/src/chunking.ts`, `firestore.rules`, `storage.rules`.
- **Gemini / RAG / study tools** — `functions/src/geminiClient.ts`, `functions/src/embeddings.ts`, `functions/src/retrieval.ts`, `functions/src/prompts.ts`, `functions/src/chat.ts`, `src/features/study/`.

See [`ACCESSIBILITY_AI_STUDY_PLATFORM_PLAN.md`](./ACCESSIBILITY_AI_STUDY_PLATFORM_PLAN.md) for the full breakdown, MVP acceptance criteria, and demo script.
