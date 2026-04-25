# Studylift

AI study help for PDFs, DOCX, and text: accessibility settings, document-grounded Gemini chat, and Firestore-backed profiles. Product details: [`ACCESSIBILITY_AI_STUDY_PLATFORM_PLAN.md`](./ACCESSIBILITY_AI_STUDY_PLATFORM_PLAN.md).

**Stack:** React (Vite) + Firebase (Auth, Firestore, Storage, Hosting, Functions) + Gemini (server only).

**Requirements:** Node **20** (see [`.nvmrc`](.nvmrc)), Firebase project on the **Blaze** plan, [Gemini API key](https://aistudio.google.com/app/apikey). Use `npm ci` and `npm --prefix functions ci` (lockfiles are committed).

---

## What’s going on (check off)

| Step | You |
|------|-----|
| Firebase app + Auth (Anonymous, Email, Google) + Firestore + Storage enabled | Console |
| `VITE_FIREBASE_*` in **root `.env`** or **`.env.local`** (from Firebase project settings) | You |
| **`.firebaserc`** has the right `default` project, or `npx firebase use --add` | You |
| **`npx firebase login`** — Google account with deploy access | You |
| **`GEMINI_API_KEY` in Google Secret Manager** (production Functions). **Not** the same as `.env` in the browser | Owner or you (if IAM allows) — see [secrets 403](#if-secrets-set-fails-403) |
| **Deploy** | `npm run deploy` after the above |

**Local only:** `functions/.secret.local` = Gemini for the **emulator**. It does **not** deploy the key to production.

**First vector index** can take a few minutes after the first `firestore:indexes` deploy — watch the Firestore “Indexes” tab in the console.

**Cloud Functions region** must match your **default Storage bucket** region. This repo uses **`us-east1`** in [`functions/src/constants.ts`](functions/src/constants.ts), applies it at runtime in [`functions/src/initRuntime.ts`](functions/src/initRuntime.ts), and uses the same default in [`src/lib/firebase.ts`](src/lib/firebase.ts). Set `VITE_FUNCTIONS_REGION` in `.env` to the same value, or the client will call the wrong region for callables. If deploy says a function *cannot listen to a bucket* in another region, align these.

---

## Commands

### Install

```bash
nvm use 20    # or install Node 20; optional if nvm is set up
npm ci
npm --prefix functions ci
```

If you stay on Node 25, npm will still build, but you will keep seeing **engine warnings** from Firebase tooling and Cloud Functions packages. Node 20 matches this repo and Google Cloud Functions.

### Local quick start (recommended)

This repo is configured to use Firebase emulators by default (`VITE_USE_EMULATORS=true` in the root `.env`). You run **two terminals** from the **repo root** (the folder that contains `package.json` and `firebase.json`).

> The Firebase emulator suite requires **Java** on `PATH`. If `npx firebase emulators:start` fails with `Unable to locate a Java Runtime`, install Java first (see below) or use [Local frontend only](#local-frontend-only).

#### One-time setup (machine + repo)

```bash
# macOS (Homebrew) — Java for emulators:
brew install openjdk@21
echo 'export PATH="/opt/homebrew/opt/openjdk@21/bin:$PATH"' >> ~/.zprofile
source ~/.zprofile
java -version

# From repo root — install deps (after clone or lockfile changes):
nvm use 20    # optional; or install Node 20 from nodejs.org
npm ci
npm --prefix functions ci

# Gemini for Functions *emulator only* (gitignored):
printf 'GEMINI_API_KEY=your-gemini-key-here\n' > functions/.secret.local
```

Ensure root **`.env`** exists with your `VITE_FIREBASE_*` values and `VITE_USE_EMULATORS=true` (or copy from a teammate if `.env` is not in git).

#### Run on your screen (exact two-terminal flow)

Use **Terminal.app**, iTerm, or Cursor’s integrated terminal. **Start emulators first**, wait for readiness, then start Vite.

**Terminal 1 — emulators** (same shell must see `java`; on Apple Silicon Homebrew OpenJDK 21):

```bash
cd /path/to/UWBHackathon2026
export PATH="/opt/homebrew/opt/openjdk@21/bin:$PATH"
npx firebase emulators:start --only auth,functions,firestore,storage
```

Leave this running. Wait until you see **`All emulators ready! It is now safe to connect your app.`** and the port table (Auth `9099`, Functions `5001`, Firestore `8080`, Storage `9199`).

**Terminal 2 — Vite** (open a *new* tab/window after the line above appears):

```bash
cd /path/to/UWBHackathon2026
npm run dev -- --port 5173 --strictPort
```

**Open in the browser**

- App: `http://localhost:5173`
- Emulator UI: `http://127.0.0.1:4000`

If the first page load shows Firestore “could not reach backend” / offline warnings in the Vite terminal, wait for **All emulators ready** in Terminal 1, then **refresh** the browser once. That happens when the UI loads a moment before Firestore is accepting connections.

Optional explicit override (only if you are not using `VITE_USE_EMULATORS=true` in `.env`):

```bash
VITE_USE_EMULATORS=true npm run dev -- --port 5173 --strictPort
```

#### Stop everything

```bash
lsof -nP -iTCP:5173,5001,8080,9099,9199,4000,4400 -sTCP:LISTEN
kill <PID>    # repeat for each PID listed (node / java)
```

Or press **Ctrl+C** in each terminal that is still running.

Why `--only auth,functions,firestore,storage`? The app is served by Vite, so the Firebase Hosting emulator is optional and skipping it avoids port clashes (for example on `5000`).

**What you get**

- React app on Vite
- Auth / Firestore / Storage / Functions emulators from [`firebase.json`](./firebase.json)
- Gemini in the Functions emulator via `functions/.secret.local`

### Local frontend only

If you only want to verify the UI against the deployed Firebase project without backend emulators, override the default emulator setting for that terminal:

```bash
VITE_USE_EMULATORS=false npm run dev -- --port 5173 --strictPort
```

If anonymous auth is disabled in the live Firebase project, use the normal sign-in flow on `/login` instead of relying on guest auth.

### Production: set Gemini + deploy

Use an account that is allowed to create secrets (or ask the [project owner](#if-secrets-set-fails-403) to do the first line once):

```bash
npx firebase login
npx firebase use   # should show your .firebaserc project

# Production Gemini (Secret Manager) — not your client .env
npx firebase functions:secrets:set GEMINI_API_KEY
# optional first pass for rules + indexes:
# npx firebase deploy --only firestore:rules,storage:rules,firestore:indexes

npm run deploy
```

`npm run deploy` = Vite production build + `firebase deploy` (hosting, functions, rules, indexes as in [`firebase.json`](./firebase.json)).

**Only part of the app changed?**

```bash
npx firebase deploy --only hosting
npx firebase deploy --only functions
```

**CI:** use a [Firebase / Google Cloud service account or token](https://firebase.google.com/docs/cli#install-cli) instead of an interactive login.

### First-time `firebase deploy` (Functions) — IAM

If deploy stops with *“We failed to modify the IAM policy for the project”* (Gen2 / Eventarc / Cloud Run), the app code is usually fine; Google Cloud just has not granted the required service-agent roles yet.

A **project Owner** or someone with **Owner** / **Project IAM Admin** should either:

1. Run `npx firebase deploy` again while logged in as an owner, or
2. Run the exact `gcloud projects add-iam-policy-binding ...` commands the Firebase CLI printed.

For this project (`hackathonproject-4bd31`), Firebase asked for:

```bash
gcloud projects add-iam-policy-binding hackathonproject-4bd31 \
  --member=serviceAccount:service-216621022534@gs-project-accounts.iam.gserviceaccount.com \
  --role=roles/pubsub.publisher

gcloud projects add-iam-policy-binding hackathonproject-4bd31 \
  --member=serviceAccount:service-216621022534@gcp-sa-pubsub.iam.gserviceaccount.com \
  --role=roles/iam.serviceAccountTokenCreator

gcloud projects add-iam-policy-binding hackathonproject-4bd31 \
  --member=serviceAccount:216621022534-compute@developer.gserviceaccount.com \
  --role=roles/run.invoker

gcloud projects add-iam-policy-binding hackathonproject-4bd31 \
  --member=serviceAccount:216621022534-compute@developer.gserviceaccount.com \
  --role=roles/eventarc.eventReceiver
```

That is normally a **one-time project setup** for Gen2 Functions. After it is done, `npm run deploy` should get past this blocker.

### Set the Gemini secret (when the CLI asks for a value)

For `npx firebase functions:secrets:set GEMINI_API_KEY`, **paste the Gemini API key** from [AI Studio](https://aistudio.google.com/app/apikey) as the value (not the Firebase web `apiKey` from the console). Then deploy so functions pick it up.

### Check that you are ready to deploy

```bash
npx firebase login:list          # should list your Google account
npx firebase use                 # should show your project id (see .firebaserc)
npx firebase functions:secrets:describe GEMINI_API_KEY   # should show a version, e.g. ENABLED
npm run build && npm --prefix functions run build
npx firebase deploy
```

If `deploy` succeeds, use the **Hosting** URL in the output and test upload → document **ready** → chat.

---

## If `secrets:set` fails (403)

The CLI user needs IAM on the **Google Cloud** project (same id as Firebase). A **project Owner** should either:

- Add your Google account: **Service Usage Consumer** and **Secret Manager Admin** (or **Editor** for a small team), and enable the [Secret Manager API](https://console.cloud.google.com/apis/library/secretmanager.googleapis.com?project=_), *or*
- Run `npx firebase functions:secrets:set GEMINI_API_KEY` once themselves, then you deploy.

Direct IAM: `https://console.cloud.google.com/iam-admin/iam?project=<project-id>` (id is in [`.firebaserc`](.firebaserc)). Wait a few minutes after role changes, then retry.

---

## Where keys live

| What | Where |
|------|--------|
| `VITE_FIREBASE_*` | Root `.env.local` / `.env` — public to the **browser** after Vite build |
| `GEMINI_API_KEY` (cloud) | **Secret Manager** — set with `npx firebase functions:secrets:set` |
| `GEMINI_API_KEY` (emulator) | `functions/.secret.local` (gitignored) |

The Gemini key never goes in a `VITE_*` variable.

---

## Deployment concerns

- **Region coupling:** the Storage trigger must stay in the same region as the default bucket. This repo is currently wired for **`us-east1`**.
- **First deploy IAM:** Gen2 Functions may fail until a project owner grants the Google-managed service accounts the required Eventarc / PubSub / Run roles.
- **Node version:** local development and deploys are expected on **Node 20**.
- **Frontend bundle warning:** the production bundle currently exceeds Vite's 500 kB warning threshold. It still builds successfully, but code-splitting would be a good follow-up before the app grows further.
- **Outdated platform warning:** Firebase currently warns that Cloud Functions Node 20 will age out later in 2026 and that `firebase-functions` is not the latest major. That is not blocking today, but it should be scheduled.

---

## Repo map (short)

- `src/` — React app (`lib/firebase.ts`, `lib/functions.ts`, `features/`)
- `functions/` — Cloud Functions + Gemini
- `firestore.rules`, `storage.rules`, `firestore.indexes.json` — backend policy + indexes

Deeper structure and team tracks are in the [plan](ACCESSIBILITY_AI_STUDY_PLATFORM_PLAN.md).

**New packages:** add in root or `functions/`, then commit the matching `package-lock.json` and use `npm ci` everywhere.

---

## Library (Dashboard)

The **Library** page (`/dashboard`) includes:

- **Chats** — links to general study (`/study`) and each uploaded document (`/study/:docId`).
- **Folders** — create folders, add/remove documents, delete folders. With Firebase: stored under `users/{uid}/folders`. Without full config (preview / demo session): stored in **localStorage** for this browser only.
- **Flashcards** — saved sets from document study: use **Flashcards** mode in the doc chat panel, then **Save to library** on a tutor reply. Stored under `users/{uid}/flashcardDecks` (or localStorage in preview).
- **Quizzes** — same flow with **Quiz** mode and **Save quiz to library**. Stored under `users/{uid}/quizzes` (or localStorage in preview).

Deploy updated **Firestore rules and indexes** after pulling changes:

```bash
npx firebase deploy --only firestore:rules,firestore:indexes
```

### Preview vs live

| Mode | What works |
|------|------------|
| **No `VITE_FIREBASE_*` (or incomplete)** | UI runs; auth uses a local preview user; library folders/decks/quizzes persist in `localStorage` only. |
| **Full Firebase + Anonymous / sign-in** | Real Auth + Firestore; library syncs to the cloud (per user). |
| **Anonymous disabled** | Sign in with Google/email from `/login` (still reachable as a guest). Auth falls back to a local session if anonymous sign-in fails. |
| **Auth fallback (local session)** | If Firebase is configured but you are not actually signed in to Auth (rare fallback), accessibility settings stay in memory for the tab; library still uses `localStorage` like preview. |

### Quick manual check

1. **Study** and **Library** in the header load (no stuck “Loading…”).  
2. **Login** — guest can open the form; after **real** sign-in, library is tied to that account.  
3. **Dashboard** — create a folder, add a document from the dropdown, delete a folder.  
4. Open a **ready** document in Study — toggle modes, **Save to library** / **Save quiz to library**; confirm items appear on the dashboard.
