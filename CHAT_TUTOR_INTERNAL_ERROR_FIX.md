# Chat/Tutor AI Internal Error Fix (Teammate Guide)

Use this exactly if chat or study tutor shows an internal error.

## 1) Open PowerShell in repo root

```powershell
cd C:\Users\neilc\Hackathon2026\UWBHackathon2026
```

## 2) Ensure Node 20 is active

```powershell
node -v
npm -v
```

Expected: Node is `v20.x` (not v24/v25).

## 3) Ensure frontend is using emulators

Open `.env.local` and confirm:

```env
VITE_USE_EMULATORS=true
VITE_FUNCTIONS_REGION=us-east1
```

If `VITE_USE_EMULATORS` is `false`, change it to `true`.

## 4) Ensure Gemini local secret exists

```powershell
Set-Content -Path functions\.secret.local -Value "GEMINI_API_KEY=YOUR_GEMINI_KEY_HERE"
```

If you already have your key there, do not overwrite it.

## 5) Install dependencies (root + functions)

```powershell
npm ci
npm --prefix functions ci
```

## 6) Build Functions (required)

```powershell
npm --prefix functions run build
```

This must produce `functions/lib/index.js`.

## 7) Stop stale processes if ports are busy

```powershell
taskkill /F /IM node.exe 2>$null
taskkill /F /IM java.exe 2>$null
```

## 8) Start emulators (Terminal 1)

```powershell
cd C:\Users\neilc\Hackathon2026\UWBHackathon2026
npx firebase emulators:start --only auth,functions,firestore,storage
```

Wait for "All emulators ready".

You should also see Functions initialize lines for:
- `quickChat`
- `chatWithDocument`
- `saveFeedback`
- `retryDocumentProcessing`

## 9) Start frontend (Terminal 2)

```powershell
cd C:\Users\neilc\Hackathon2026\UWBHackathon2026
npm run dev -- --port 5173 --strictPort
```

## 10) Open app + emulator UI

- App: http://localhost:5173
- Emulator UI: http://127.0.0.1:4000

---

## If chat still fails

### A) Confirm emulator ports are listening

```powershell
Get-NetTCPConnection -LocalPort 5001,8080,9099,9199,4000,5173 -State Listen |
  Select-Object LocalPort,OwningProcess |
  Sort-Object LocalPort
```

### B) Confirm functions were built

```powershell
Get-ChildItem functions\lib\index.js
```

### C) Full clean reset

```powershell
taskkill /F /IM node.exe 2>$null
taskkill /F /IM java.exe 2>$null
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force functions\node_modules -ErrorAction SilentlyContinue
npm ci
npm --prefix functions ci
npm --prefix functions run build
```

Then start emulator + frontend again (steps 8 and 9).

---

## Why this fixes the internal error

The internal error usually happens when one of these is true:
- Frontend is pointed to live Firebase instead of local emulators.
- Functions were not built (`functions/lib/index.js` missing).
- Emulator function discovery timed out and callable functions did not register.
- Port conflicts left stale emulators/processes running.

This guide addresses all four causes in the correct order.
