# Accessibility-First AI Study Platform Plan

## 1. Product Summary

This project is an accessibility-first AI study platform for students who need learning materials presented in different ways. A user uploads a PDF, DOCX, or other study file, creates an accessibility and study profile, and receives a personalized reading and study experience.

The core product is not a generic chatbot. The app takes the same uploaded material and adapts it into multiple usable formats:

- Dyslexia-friendly reading.
- ADHD / executive-function guided study.
- Low-vision / visual impairment-friendly presentation.
- Simplified explanations.
- Summaries.
- Flashcards.
- Quizzes.
- Step-by-step breakdowns.
- Document-grounded AI chat.

The product follows the Universal Design for Learning idea that students benefit from multiple means of representation. The app should support user override at all times because no single mode will work for every user or every context.

## 1.1 Project Setup

### Prerequisites

- Node.js (v18 or higher recommended)
- npm
- A Google account for Firebase and Gemini API access

### Step 1: Clone and Install Dependencies

```bash
git clone <repo-url>
cd UWBHackathon2026
npm install
```

### Step 2: Install Firebase CLI (Global)

```bash
npm install -g firebase-tools
```

### Step 3: Install Firebase Client SDK (Frontend)

```bash
npm install firebase
```

### Step 4: Login to Firebase

```bash
firebase login
```

### Step 5: Initialize Firebase Services (if not already done)

```bash
firebase init
```

Select: Firestore, Functions, Storage

### Step 6: Install Backend Dependencies (Cloud Functions)

```bash
cd functions
npm install firebase-admin firebase-functions @google/genai pdf-parse mammoth
```

### API Keys Setup

#### Gemini API Key (Backend)

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Create a new API key
3. Create file `functions/.secret.local`:

```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

For production:

```bash
firebase functions:secrets:set GEMINI_API_KEY
```

#### Firebase Config (Frontend)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Project Settings (gear icon) → General → Your apps → Web app
3. Create file `.env.local` in the **root folder**:

```bash
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123:web:abc
```

### Files to Never Commit

Ensure these are in `.gitignore`:

```
.env.local
.env
functions/.secret.local
```

## 2. Core Idea

The website combines three systems:

1. An accessible document reader.
2. A document-grounded Gemini tutor.
3. A preference profile that shapes both the UI and AI output.

The core formula is:

```text
uniqueOutput =
  Gemini(
    userMessage,
    selectedStudyMode,
    userAccessibilityProfile,
    retrievedDocumentChunks,
    recentChatContext,
    feedbackHistory
  )
```

The same document and same question can produce different outputs depending on the user's selected support settings.

Example:

```text
User A:
Needs short text, extra spacing, one step at a time.

Output:
Short, chunked explanation with simple wording and a next-step prompt.

User B:
Needs quiz-first active recall.

Output:
Multiple-choice or short-answer questions before explanation.

User C:
Needs low-vision support.

Output:
High-contrast reader, large text, semantic headings, and audio-friendly answer.
```

## 3. V1 Scope

Version 1 focuses on three support areas:

- Dyslexia.
- ADHD / executive-function support.
- Low vision / visual impairment.

Version 1 should not try to support every disability category. It should not create a broad "neurodivergent mode." Instead, it should model specific support settings that can be combined.

## 4. V1 Non-Goals

Do not build these in v1:

- Full support for every disability.
- Complex video or lecture transcription.
- Live voice agents.
- Camera-based tutoring.
- Multi-user classrooms.
- Teacher dashboards.
- Offline-first support.
- Perfect automatic diagnosis or inference of user needs.
- Fully automatic OCR for every scanned document, unless there is extra time.

## 5. Main User Flow

```text
User lands on site
  -> signs up / logs in
  -> completes onboarding
  -> uploads document
  -> backend extracts and chunks text
  -> backend creates embeddings
  -> user opens adaptive reader
  -> user asks questions or chooses study tools
  -> backend retrieves relevant chunks
  -> Gemini generates personalized output
  -> output is saved
  -> user gives feedback
  -> profile improves over time
```

## 6. Website Pages

### 6.1 Landing Page

Purpose:

- Explain the product.
- Show that the app is accessibility-first.
- Drive sign-up.

Content:

- Product headline.
- Short explanation.
- Supported modes.
- Example transformation.
- Call to action.

Example headline:

```text
Study materials that adapt to how you read, focus, and learn.
```

### 6.2 Auth Page

Purpose:

- Sign up and log in users.

V1 auth options:

- Google sign-in.
- Email/password.

Firebase service:

- Firebase Auth.

### 6.3 Onboarding Page

Purpose:

- Create the user's accessibility and study profile.

Questions should focus on supports, not diagnosis.

Example sections:

- Reading preferences.
- Focus preferences.
- Visual preferences.
- Study preferences.
- Audio preferences.

Example options:

- Larger text.
- Extra spacing.
- Shorter chunks.
- Line focus.
- High contrast.
- Read aloud.
- One task at a time.
- Simplified explanations.
- Quiz-first mode.
- Step-by-step explanations.

### 6.4 Dashboard Page

Purpose:

- Show uploaded documents.
- Let the user upload new material.
- Show processing status.
- Let the user continue studying.

Dashboard items:

- Upload document button.
- Document cards.
- Status badges.
- Last opened date.
- Continue studying button.
- Settings shortcut.

Example statuses:

- `uploaded`
- `processing`
- `ready`
- `failed`

### 6.5 Document Workspace Page

Purpose:

- Main study experience.

Core sections:

- Document reader.
- Accessibility toolbar.
- AI chat.
- Study tools.
- Feedback prompts.

Tabs or panels:

- Reader.
- Chat.
- Summary.
- Simplify.
- Quiz.
- Flashcards.
- Step-by-step.

### 6.6 Settings Page

Purpose:

- Let users manually adjust support settings.

Settings:

- Font scale.
- Spacing.
- Contrast.
- Line focus.
- Read-aloud default.
- Response length.
- Default study mode.
- Quiz difficulty.
- Simplification level.

Manual settings should always override automatic preference learning.

## 7. Frontend Architecture

The frontend should use:

- React.
- TypeScript.
- Vite.
- Firebase client SDK.
- React Router.

The frontend should not directly call Gemini. It should call Firebase Cloud Functions.

### 7.1 Proposed Frontend Structure

```text
src/
  app/
    App.tsx
    router.tsx
    providers.tsx

  lib/
    firebase.ts
    functions.ts
    routes.ts
    constants.ts

  types/
    user.ts
    profile.ts
    document.ts
    chunk.ts
    chat.ts
    study.ts

  features/
    auth/
      AuthProvider.tsx
      LoginPage.tsx
      ProtectedRoute.tsx
      useAuth.ts

    onboarding/
      OnboardingPage.tsx
      PreferenceForm.tsx
      profileDefaults.ts

    documents/
      DashboardPage.tsx
      UploadDocument.tsx
      DocumentCard.tsx
      DocumentStatus.tsx
      useDocuments.ts
      useUploadDocument.ts

    reader/
      DocumentReader.tsx
      ReaderChunk.tsx
      AccessibilityToolbar.tsx
      LineFocus.tsx
      ReadAloudButton.tsx
      useReaderPreferences.ts

    study/
      StudyWorkspace.tsx
      ChatPanel.tsx
      ChatMessage.tsx
      StudyModeSelector.tsx
      SummaryView.tsx
      QuizView.tsx
      FlashcardsView.tsx
      StepByStepView.tsx

    feedback/
      FeedbackPrompt.tsx
      useFeedback.ts

  styles/
    globals.css
    tokens.css
    accessibility.css
```

### 7.2 Frontend Responsibilities

The frontend handles:

- Authentication UI.
- Profile onboarding.
- File uploads to Firebase Storage.
- Firestore document creation.
- Real-time document status display.
- Document reader rendering.
- Accessibility UI controls.
- Chat input and output display.
- Study tool buttons.
- Feedback collection.

The frontend does not handle:

- API secrets.
- Gemini calls.
- Text extraction.
- Embedding generation.
- Vector search.
- Trust/security checks.

## 8. Backend Architecture

The backend should use:

- Firebase Cloud Functions.
- Firebase Admin SDK.
- Firebase Storage.
- Firestore.
- Gemini API through `@google/genai`.
- Firestore vector search.

### 8.1 Proposed Backend Structure

```text
functions/
  src/
    index.ts
    firebaseAdmin.ts
    geminiClient.ts

    documentProcessor.ts
    chunking.ts

    extractors/
      pdf.ts
      docx.ts

    embeddings.ts
    retrieval.ts
    prompts.ts

    chat.ts
    studyTools.ts
    profileFeedback.ts
    validators.ts
    errors.ts

  .secret.local.example
  package.json
  tsconfig.json
```

Additional Firebase files:

```text
firebase.json
.firebaserc
firestore.rules
storage.rules
firestore.indexes.json
```

## 9. Gemini API Usage

Gemini is used for all backend AI tasks.

### 9.1 Gemini Tasks

Use Gemini for:

- Chat responses.
- Simplified explanations.
- Summaries.
- Quizzes.
- Flashcards.
- Step-by-step breakdowns.
- Key ideas.
- Chunk embeddings.
- Query embeddings.

### 9.2 Recommended Models

Generation:

```text
gemini-2.5-flash
```

Embeddings:

```text
gemini-embedding-2
```

Embedding output dimension:

```text
768 or 1536
```

Reason:

Firestore vector search currently supports a maximum embedding dimension of 2048, so the embedding output should stay under that limit.

### 9.3 Where API Keys Go

There are two different kinds of config.

Frontend Firebase config:

```text
.env.local
```

Example:

```bash
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

These are browser Firebase config values. They are not the Gemini key.

Gemini backend secret:

```text
functions/.secret.local
```

Example:

```bash
GEMINI_API_KEY=your_actual_gemini_api_key_here
```

Production/deployed secret:

```bash
firebase functions:secrets:set GEMINI_API_KEY
```

Never commit:

- `.env.local`
- `.env`
- `functions/.secret.local`
- Any file containing the real Gemini API key.

### 9.4 Gemini Cloud Function Pattern

```ts
import { GoogleGenAI } from "@google/genai";
import { defineSecret } from "firebase-functions/params";
import { onCall } from "firebase-functions/v2/https";

const geminiApiKey = defineSecret("GEMINI_API_KEY");

export const chatWithDocument = onCall(
  { secrets: [geminiApiKey] },
  async (request) => {
    const uid = request.auth?.uid;

    if (!uid) {
      throw new Error("User must be authenticated.");
    }

    const ai = new GoogleGenAI({
      apiKey: geminiApiKey.value(),
    });

    // 1. Validate input.
    // 2. Verify document ownership.
    // 3. Retrieve chunks.
    // 4. Build prompt.
    // 5. Call Gemini.
    // 6. Save response.
  },
);
```

## 10. Firebase Data Model

### 10.1 User Document

Path:

```text
users/{uid}
```

Fields:

```js
{
  displayName: string,
  email: string,
  createdAt: Timestamp,
  lastLoginAt: Timestamp
}
```

### 10.2 User Profile

Path:

```text
users/{uid}/profile/main
```

Fields:

```js
{
  supports: {
    dyslexia: boolean,
    adhd: boolean,
    lowVision: boolean
  },
  uiPreferences: {
    fontScale: number,
    highContrast: boolean,
    extraSpacing: boolean,
    lineFocus: boolean,
    maxLineWidth: "standard" | "narrow",
    reducedMotion: boolean
  },
  studyPreferences: {
    readAloud: boolean,
    simplifyLanguage: boolean,
    oneStepAtATime: boolean,
    responseLength: "short" | "medium" | "detailed",
    defaultStudyMode: "reader" | "guided" | "quiz" | "chat"
  },
  feedbackSignals: {
    prefersShorterAnswers: number,
    prefersQuizFirst: number,
    prefersStepByStep: number,
    highContrastUsedOften: boolean
  },
  updatedAt: Timestamp
}
```

### 10.3 Document Metadata

Path:

```text
documents/{docId}
```

Fields:

```js
{
  uid: string,
  fileName: string,
  storagePath: string,
  mimeType: string,
  status: "uploaded" | "processing" | "ready" | "failed",
  processingStage:
    | "waiting"
    | "extracting_text"
    | "chunking"
    | "generating_embeddings"
    | "complete"
    | "failed",
  chunkCount: number,
  createdAt: Timestamp,
  updatedAt: Timestamp,
  error: string | null
}
```

### 10.4 Document Chunks

Path:

```text
documents/{docId}/chunks/{chunkId}
```

Fields:

```js
{
  uid: string,
  docId: string,
  text: string,
  pageNumber: number | null,
  heading: string | null,
  sectionType: "title" | "heading" | "body" | "list" | "table" | "unknown",
  orderIndex: number,
  keywords: string[],
  embedding: Vector,
  adaptationMetadata: {
    suggestedChunkSize: "short" | "medium" | "long",
    estimatedDifficulty: "easy" | "medium" | "hard",
    hasDefinition: boolean,
    hasSteps: boolean
  },
  createdAt: Timestamp
}
```

### 10.5 Chats

Path:

```text
documents/{docId}/chats/{chatId}
```

Fields:

```js
{
  uid: string,
  docId: string,
  mode: "chat" | "summary" | "simplify" | "quiz" | "flashcards" | "steps",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### 10.6 Chat Messages

Path:

```text
documents/{docId}/chats/{chatId}/messages/{messageId}
```

Fields:

```js
{
  role: "user" | "assistant",
  content: string,
  retrievedChunkIds: string[],
  citations: Array<{
    chunkId: string,
    pageNumber: number | null,
    heading: string | null
  }>,
  timestamp: Timestamp
}
```

### 10.7 Feedback

Path:

```text
documents/{docId}/feedback/{feedbackId}
```

Fields:

```js
{
  uid: string,
  targetType: "reader" | "chat" | "summary" | "quiz" | "flashcards" | "steps",
  targetId: string,
  signal:
    | "easier_to_read"
    | "too_long"
    | "too_short"
    | "too_complex"
    | "use_this_style"
    | "quiz_too_easy"
    | "quiz_too_hard",
  value: boolean | number | string,
  createdAt: Timestamp
}
```

## 11. Storage Layout

Original uploaded files:

```text
users/{uid}/documents/{docId}/original/{fileName}
```

Optional processed files later:

```text
users/{uid}/documents/{docId}/processed/text.json
users/{uid}/documents/{docId}/processed/pages.json
```

## 12. Full Document Upload Pipeline

### Step 1: User Uploads File

Frontend:

1. Creates a `docId`.
2. Uploads file to Firebase Storage.
3. Creates Firestore document metadata.
4. Redirects user to processing screen.

### Step 2: Cloud Function Starts

Triggered by:

- Storage upload, or
- Firestore document creation.

The recommended v1 trigger is Storage upload, with Firestore metadata updated during processing.

### Step 3: File Is Downloaded

Cloud Function downloads the uploaded file from Firebase Storage.

### Step 4: Text Is Extracted

PDF:

- Extract text by page when possible.

DOCX:

- Extract paragraphs and headings.

Scanned PDFs:

- Mark as unsupported or "OCR needed" in v1 unless OCR is added.

### Step 5: Text Is Normalized

Normalize:

- Extra whitespace.
- Broken line wrapping.
- Repeated headers/footers when detectable.
- Empty chunks.

### Step 6: Text Is Chunked

Chunking strategy:

- Preserve heading/page metadata.
- Target roughly 500-900 tokens per chunk.
- Keep order indexes stable.
- Avoid splitting in the middle of definitions or numbered steps when possible.

### Step 7: Chunks Are Saved

Each chunk is written to:

```text
documents/{docId}/chunks/{chunkId}
```

### Step 8: Embeddings Are Generated

Use Gemini `gemini-embedding-2`.

Store embedding on each chunk.

### Step 9: Firestore Vector Index Enables Search

Create vector index on:

```text
documents/*/chunks.embedding
```

Use filters for:

- `uid`
- `docId`

### Step 10: Document Marked Ready

Firestore document is updated:

```js
{
  status: "ready",
  processingStage: "complete",
  chunkCount: 42
}
```

## 13. AI Chat Pipeline

When a user sends a message:

```text
Frontend sends docId, chatId, message, mode
  -> Cloud Function validates auth
  -> Cloud Function verifies document ownership
  -> Load user profile
  -> Embed user message with Gemini
  -> Vector search relevant chunks
  -> Load recent chat history
  -> Build prompt
  -> Call Gemini
  -> Save response
  -> Return response to frontend
```

### 13.1 Chat Request Shape

```js
{
  docId: string,
  chatId?: string,
  message: string,
  mode: "chat" | "summary" | "simplify" | "quiz" | "flashcards" | "steps"
}
```

### 13.2 Chat Response Shape

```js
{
  chatId: string,
  messageId: string,
  content: string,
  retrievedChunkIds: string[],
  citations: Array<{
    chunkId: string,
    pageNumber: number | null,
    heading: string | null
  }>
}
```

## 14. Prompt Strategy

The prompt should include:

- System role.
- Accessibility principles.
- User profile.
- Current study mode.
- Retrieved chunks.
- Recent chat context.
- User request.

Example structure:

```text
You are an accessibility-first study tutor.

Rules:
- Use only the retrieved document content unless you clearly say otherwise.
- Prefer clear, grounded answers.
- Respect the user's accessibility and study preferences.
- Do not diagnose the user.
- Cite chunks or pages when possible.

User preferences:
- Response length: short
- Simplified language: true
- One step at a time: true
- Extra spacing: true

Study mode:
quiz

Retrieved document chunks:
[chunk12, page 3]
...

[chunk13, page 4]
...

Recent chat:
...

User request:
Quiz me on section 3.
```

## 15. Study Modes

### 15.1 Chat

Freeform document-grounded Q&A.

Example:

```text
What does section 2 mean?
```

### 15.2 Simplify

Turns selected content into easier wording.

Output style:

- Short sentences.
- Clear definitions.
- Reduced jargon.
- Optional bullet points.

### 15.3 Summary

Creates:

- Short summary.
- Key ideas.
- Important terms.
- What to review first.

### 15.4 Quiz

Creates:

- Multiple choice.
- Short answer.
- One-question-at-a-time mode.
- Feedback after answer.

### 15.5 Flashcards

Creates:

```js
[
  {
    front: "What is photosynthesis?",
    back: "The process plants use to make food from sunlight."
  }
]
```

### 15.6 Step-By-Step

Best for assignments and dense instructions.

Output:

- Ordered steps.
- One action per step.
- Optional progress tracker.

## 16. Adaptive Reader

The reader should render the same chunks with different presentation settings.

### 16.1 Dyslexia Supports

Features:

- Larger font.
- Increased letter spacing.
- Increased line spacing.
- Shorter lines.
- Paragraph chunking.
- Line focus.
- Read aloud.

### 16.2 ADHD / Executive-Function Supports

Features:

- One idea at a time.
- Reduced clutter.
- Progress indicator.
- Next-step navigation.
- Short summary before details.
- Checklist-style study flow.
- Quiz-first option.

### 16.3 Low-Vision Supports

Features:

- High contrast.
- Large text.
- Keyboard navigation.
- Visible focus states.
- Semantic headings.
- Screen-reader-friendly landmarks.
- Read aloud.

## 17. Feedback and Personalization Loop

After responses or reading sessions, ask simple feedback:

```text
Was this easier to read?
Do you want this style by default?
Was this too long?
Was this quiz too easy or too hard?
```

Store feedback and update preference signals.

Important rule:

The app can learn preferences, but it should not infer medical labels.

Allowed:

```text
User seems to prefer short answers.
```

Not allowed:

```text
User definitely has ADHD.
```

## 18. Security Plan

### 18.1 Auth

All private app pages require Firebase Auth.

### 18.2 Firestore Rules

Users can only access:

- Their own user record.
- Their own profile.
- Documents where `uid == request.auth.uid`.
- Chunks belonging to their documents.
- Chats/messages belonging to their documents.
- Feedback belonging to them.

### 18.3 Storage Rules

Users can only upload/read files under:

```text
users/{uid}/documents/**
```

### 18.4 Cloud Function Validation

Every callable function must:

- Require auth.
- Validate input shape.
- Verify document ownership.
- Enforce file type limits.
- Enforce file size limits.
- Avoid logging sensitive prompt contents or API keys.

### 18.5 Secret Handling

Gemini API key:

- Stored in Firebase Secret Manager for deployment.
- Stored in `functions/.secret.local` for local backend dev.
- Never exposed to frontend.
- Never committed.

## 19. Team Breakdown

### Lead / Integration Owner

Responsibilities:

- Final architecture decisions.
- Firebase project setup.
- Repo standards.
- Shared types.
- PR review.
- Integration testing.
- Deployment.

### Teammate 1: Frontend Core

Responsibilities:

- TypeScript migration.
- Routing.
- App shell.
- Auth UI.
- Protected routes.
- Dashboard.
- Shared components.

Deliverables:

- User can sign in.
- User can reach dashboard.
- Protected pages work.
- Basic app layout is stable.

### Teammate 2: Accessibility UX

Responsibilities:

- Onboarding profile form.
- Settings page.
- Adaptive reader.
- Accessibility toolbar.
- Line focus.
- Text-to-speech.
- High contrast and keyboard QA.

Deliverables:

- User can create/edit profile.
- Reader changes based on support settings.
- Dyslexia, ADHD, and low-vision controls work.

### Teammate 3: Firebase Backend

Responsibilities:

- Firestore schema.
- Storage upload integration.
- Cloud Functions setup.
- PDF/DOCX extraction.
- Chunking.
- Firestore and Storage rules.

Deliverables:

- User uploads a document.
- Backend extracts text.
- Chunks are saved.
- Processing status updates.

### Teammate 4: Gemini / RAG / Study Tools

Responsibilities:

- Gemini client.
- Embedding generation.
- Firestore vector search.
- Chat function.
- Prompt templates.
- Study tool functions.

Deliverables:

- User asks document questions.
- Backend retrieves relevant chunks.
- Gemini returns grounded answer.
- Summary, simplify, quiz, flashcards, and steps work.

## 20. Build Order

### Phase 1: Foundation

Tasks:

- Convert React app to TypeScript.
- Add React Router.
- Create app layout.
- Move Firebase client config to `src/lib/firebase.ts`.
- Add shared types.
- Add accessible CSS tokens.

Done when:

- App builds.
- Routes render.
- Firebase initializes.

### Phase 2: Auth and Onboarding

Tasks:

- Add Firebase Auth.
- Add login page.
- Add protected routes.
- Add onboarding page.
- Save profile to Firestore.

Done when:

- User can sign in.
- New user is redirected to onboarding.
- Profile saves and loads.

### Phase 3: Document Upload

Tasks:

- Add dashboard.
- Add upload UI.
- Upload files to Firebase Storage.
- Create Firestore document metadata.
- Show live processing status.

Done when:

- User can upload a PDF/DOCX.
- Document appears on dashboard.
- Status updates are visible.

### Phase 4: Processing Pipeline

Tasks:

- Add Cloud Functions project.
- Add Storage trigger.
- Extract PDF/DOCX text.
- Normalize text.
- Chunk text.
- Save chunks.
- Mark document ready/failed.

Done when:

- Uploaded document becomes Firestore chunks.
- Reader can load chunks.

### Phase 5: Adaptive Reader

Tasks:

- Build document reader.
- Add accessibility toolbar.
- Add dyslexia display controls.
- Add ADHD focus controls.
- Add low-vision controls.
- Add read-aloud button.

Done when:

- User can read uploaded document chunks.
- User can switch display modes instantly.

### Phase 6: Embeddings and Vector Search

Tasks:

- Add Gemini API secret setup.
- Add `@google/genai` to Functions.
- Generate chunk embeddings.
- Store Firestore vector fields.
- Create vector index.
- Add retrieval helper.

Done when:

- Backend can retrieve relevant chunks for a query.

### Phase 7: Gemini Chat and Study Tools

Tasks:

- Add `chatWithDocument` callable function.
- Add prompt builder.
- Add chat UI.
- Add summary mode.
- Add simplify mode.
- Add quiz mode.
- Add flashcards mode.
- Add step-by-step mode.

Done when:

- User can ask questions about a document.
- Gemini answers from retrieved chunks.
- Study tools return useful formatted outputs.

### Phase 8: Feedback Loop

Tasks:

- Add feedback prompts.
- Save feedback.
- Update profile preference signals.
- Respect manual override.

Done when:

- User can mark outputs helpful/unhelpful.
- Future outputs can adjust based on saved preferences.

### Phase 9: Hardening and Deployment

Tasks:

- Add Firestore rules.
- Add Storage rules.
- Add file size/type limits.
- Add error states.
- Add retry processing.
- Add README setup docs.
- Add Firebase deploy scripts.
- Run accessibility QA.

Done when:

- App is secure enough for demo.
- Team can deploy and test consistently.

## 21. MVP Acceptance Criteria

The MVP is complete when:

- A user can sign up and log in.
- A user can complete onboarding.
- A user can upload a PDF or DOCX.
- The backend extracts and chunks the document.
- The user can read the processed document.
- The user can apply accessibility settings.
- The user can ask document-grounded questions.
- Gemini responses cite or reference retrieved chunks.
- The user can generate summary, simplify, quiz, flashcards, and step-by-step outputs.
- Feedback is saved.
- Users cannot access each other's documents.
- Gemini API key is never exposed to the frontend.

## 22. Demo Script

Use this for hackathon judging or team testing:

1. Create an account.
2. Complete onboarding with extra spacing, short answers, and one-step mode.
3. Upload a class PDF.
4. Watch processing status update.
5. Open the document reader.
6. Toggle dyslexia-friendly spacing.
7. Toggle focus mode.
8. Ask: "Explain this in simpler language."
9. Ask: "Quiz me on this section."
10. Generate flashcards.
11. Give feedback: "Use this style by default."
12. Show that settings are saved.

## 23. Final Product Positioning

This app is best described as:

```text
An accessibility-first AI study platform that turns uploaded learning materials into personalized, document-grounded reading and study experiences.
```

Short version:

```text
Upload class materials. Choose how you learn best. Get an accessible reader and AI tutor built around your needs.
```

