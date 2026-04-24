# UWB Hackathon 2026

We're winning fs. Built with **React + Vite** on the frontend and **Firebase** for auth, database, and hosting.

---

## Tech stack & pinned versions

Keep everyone on the same versions. `package-lock.json` is committed so `npm ci` installs the exact tree below.

| Tool / Package                 | Version   |
| ------------------------------ | --------- |
| Node.js                        | >= 20.19  |
| npm                            | >= 10     |
| react                          | 19.2.5    |
| react-dom                      | 19.2.5    |
| firebase                       | 12.12.1   |
| vite                           | 8.0.10    |
| @vitejs/plugin-react           | 6.0.1     |
| eslint                         | 10.2.1    |
| @eslint/js                     | 10.0.1    |
| eslint-plugin-react-hooks      | 7.1.1     |
| eslint-plugin-react-refresh    | 0.5.2     |
| globals                        | 17.5.0    |
| @types/react                   | 19.2.14   |
| @types/react-dom               | 19.2.3    |

---

## Prerequisites

1. Install Node.js **20.19+** (or 22 LTS). Check your version:
   ```bash
   node --version
   ```
   If you use `nvm`:
   ```bash
   nvm install 20
   nvm use 20
   ```
2. A Firebase project. Create one at [console.firebase.google.com](https://console.firebase.google.com).

---

## Getting started

Clone the repo and install the exact dependency tree:

```bash
git clone https://github.com/<org>/UWBHackathon2026.git
cd UWBHackathon2026
npm ci
```

> Use `npm ci` (not `npm install`) so every collaborator installs the exact versions from `package-lock.json`.

### Configure Firebase

1. In the Firebase console, open **Project settings → General → Your apps** and register a web app.
2. Copy the config values into a local env file:
   ```bash
   cp .env.example .env.local
   ```
3. Fill in `.env.local` with your Firebase web config. `.env.local` is gitignored — never commit secrets.

### Run the app

```bash
npm run dev        # start Vite dev server at http://localhost:5173
npm run build      # production build to ./dist
npm run preview    # preview the production build locally
npm run lint       # run ESLint
```

---

## Project structure

```
.
├── .env.example          # template for Firebase env vars
├── index.html            # Vite entry HTML
├── package.json          # dependencies & scripts
├── package-lock.json     # committed lockfile — source of truth for versions
├── vite.config.js        # Vite config
├── eslint.config.js      # ESLint flat config
├── public/               # static assets served as-is
└── src/
    ├── main.jsx          # React entry point
    ├── App.jsx           # root component
    ├── firebase.js       # Firebase app + auth/firestore/storage exports
    └── assets/
```

### Using Firebase in components

```js
import { auth, db, storage } from "./firebase";
```

Each export is already initialized from `src/firebase.js` using the `VITE_FIREBASE_*` env vars.

---

## Adding dependencies

When you add or upgrade a package:

```bash
npm install <package>
```

Commit **both** `package.json` and `package-lock.json` so collaborators pick up the change with `npm ci`.
