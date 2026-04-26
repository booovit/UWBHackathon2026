# Axessify

Axessify is an accessibility-first AI study platform. It lets students chat with an AI tutor, upload course materials, generate study artifacts, and personalize the reading experience with supports for dyslexia, ADHD, low vision, and different study workflows.

## Current Features

### AI Study Chat

- General AI tutor chat before uploading a file.
- Document-grounded AI chat after uploading a study document.
- Separate chat threads per study mode in document chat.
- Recent chat history included for context.
- Friendly Gemini error handling for quota/API/config issues.
- AI identity and prompts branded as Axessify.

### Study Modes

Axessify supports six study modes:

- **Chat**: ask open-ended questions.
- **Summary**: generate concise summaries.
- **Simplify**: rewrite difficult content in simpler language.
- **Quiz**: generate interactive quizzes.
- **Flashcards**: generate interactive flashcard decks.
- **Step-by-step**: break work into guided steps.

These modes work in both:

- General AI chat.
- Uploaded document chat.

### Interactive Study Artifacts

- Flashcards render as clickable front/back cards.
- Quizzes render as interactive questions with answer checking.
- Step-by-step output renders as trackable tasks.
- Generated flashcards can be saved to the library.
- Generated quizzes can be saved to the library.
- Structured artifact parsing happens in Firebase Functions.

### Document Upload And Processing

- Upload PDF, DOCX, or text-based study materials.
- Files are stored in Firebase Storage.
- Document records and chunks are stored in Firestore.
- Cloud Functions extract text, chunk content, generate embeddings, and prepare documents for retrieval.
- Failed document processing can be retried.
- Document status and processing stage are visible in the UI.

### Document Reader

- Displays extracted document chunks.
- Shows page numbers when available.
- Supports read-aloud controls.
- Supports one-step-at-a-time reading.
- Supports line focus while reading.
- Works side-by-side with document chat.

### Accessibility Controls

Controls appear before upload and inside document study views:

- Increase text size.
- Decrease text size.
- Dyslexic font toggle using OpenDyslexic.
- Extra spacing.
- Line focus.
- Narrow lines.
- Big Font toggle in the top navigation.
- Dark, light, and high-contrast theme toggle in the top navigation.
- Reduced motion preference through settings.

The Dyslexic button itself always uses the dyslexia font, even when the setting is off.

### User Profiles And Preferences

- Accessibility profile saved per user.
- Supports settings for dyslexia, ADHD/focus, and low vision.
- Display preferences include text size, Dyslexic font, high contrast, extra spacing, line focus, narrow line width, and reduced motion.
- Study preferences include response length, default study mode, read-aloud controls, simplified language, and one-step-at-a-time support.
- Guest/demo mode supported for local preview.

### Authentication

- Firebase Auth integration.
- Guest session support.
- Email/password sign-in.
- Google sign-in.
- Protected routes for Study, Dashboard, Settings, and Onboarding.

### Library And Dashboard

The Library page includes:

- General study chat entry.
- Uploaded document list.
- Document-scoped chat links.
- Study folders.
- Saved flashcard decks.
- Saved quizzes.
- Folder creation and deletion.
- Add/remove documents from folders.
- LocalStorage fallback for preview/demo sessions.
- Firestore-backed persistence for signed-in users.

### Frontend UI

- React + Vite app.
- Responsive dashboard and study workspace.
- Header navigation with Study, Library, Settings, theme controls, and Big Font.
- Accessibility controls moved before upload so users can configure the experience before chatting or adding files.
- Axessify branding across the UI.

### Backend

- Firebase Cloud Functions Gen 2.
- Firebase Admin SDK.
- Gemini generation and embeddings through server-side Functions only.
- Firestore rules and indexes.
- Storage rules.
- Secret Manager for production Gemini API key.
- `functions/.secret.local` for local emulator Gemini key.

## Stack

- React
- Vite
- TypeScript
- Firebase Auth
- Firebase Firestore
- Firebase Storage
- Firebase Functions
- Gemini API
- Netlify-compatible frontend build

## Requirements

- Node 20
- npm
- Java for Firebase emulators
- Firebase project on Blaze plan
- Gemini API key
- Firebase CLI through `npx firebase`

## Environment Variables

Create a root `.env.local` or `.env` with:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FUNCTIONS_REGION=us-east1
VITE_USE_EMULATORS=true
```

For Netlify or production frontend deploys:

```env
VITE_USE_EMULATORS=false
```

Do not put the Gemini key in a `VITE_*` variable.

For local Functions emulators, create:

```txt
functions/.secret.local
```

with:

```env
GEMINI_API_KEY=your-gemini-key
```

For production Firebase Functions:

```bash
npx firebase functions:secrets:set GEMINI_API_KEY
```

## Install

```bash
npm ci
npm --prefix functions ci
```

## Local Development

Run two terminals from the repo root.

Terminal 1:

```bash
npx firebase emulators:start --only auth,functions,firestore,storage
```

Terminal 2:

```bash
npm run dev -- --port 5173 --strictPort
```

Open:

- App: `http://localhost:5173`
- Emulator UI: `http://127.0.0.1:4000`

## Build

Frontend:

```bash
npm run build
```

Functions:

```bash
npm --prefix functions run build
```

## Firebase Deploy

Set the Gemini secret first:

```bash
npx firebase functions:secrets:set GEMINI_API_KEY
```

Deploy backend services:

```bash
npx firebase deploy --only functions,firestore:rules,firestore:indexes,storage
```

Full Firebase deploy, including hosting:

```bash
npm run deploy
```

## Netlify Deploy

Netlify should host the frontend only. Firebase still hosts Functions, Auth, Firestore, and Storage.

Netlify build settings:

```txt
Build command: npm run build
Publish directory: dist
```

Add these environment variables in Netlify:

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_FUNCTIONS_REGION=us-east1
VITE_USE_EMULATORS=false
```

After Netlify deploys, add the Netlify domain in Firebase:

```txt
Firebase Console -> Authentication -> Settings -> Authorized domains
```

## Repo Map

- `src/`: React frontend.
- `src/features/study/`: chat, study modes, artifact renderers.
- `src/features/reader/`: document reader and accessibility toolbar.
- `src/features/library/`: folders, flashcards, quizzes.
- `src/features/profile/`: profile and accessibility preferences.
- `src/routes/`: page routes.
- `functions/src/`: Firebase Functions, Gemini, document processing, artifact parsing.
- `firestore.rules`: Firestore security rules.
- `storage.rules`: Storage security rules.
- `firestore.indexes.json`: Firestore indexes.

## Manual Test Checklist

1. App loads and shows Axessify branding.
2. Theme toggle works.
3. Big Font works.
4. Accessibility toolbar controls work before upload.
5. Dyslexic font toggles only the font.
6. General AI chat works.
7. General flashcard, quiz, and step-by-step modes render interactive artifacts.
8. Document upload works.
9. Uploaded document reaches ready state.
10. Document chat answers are grounded in the uploaded file.
11. Document flashcards and quizzes can be saved to the library.
12. Library shows folders, documents, flashcards, and quizzes.
13. Sign-in works.
14. Firestore and Storage rules deploy successfully.

## Notes

- Gemini API keys must stay server-side.
- `functions/.secret.local` is for local emulators only.
- Production Gemini secrets live in Google Secret Manager.
- Node 20 is the expected runtime for Functions.
- The frontend bundle currently builds successfully but may show a Vite chunk-size warning.
