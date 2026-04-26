import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

const env = import.meta.env;

export const firebaseConfigured = Boolean(
  env.VITE_FIREBASE_API_KEY && env.VITE_FIREBASE_PROJECT_ID,
);

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || "demo-api-key",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "demo-app.firebaseapp.com",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "demo-project",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "demo-project.appspot.com",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "0",
  appId: env.VITE_FIREBASE_APP_ID || "1:0:web:0",
};

if (!firebaseConfigured) {
  // eslint-disable-next-line no-console
  console.warn(
    "[Axessify] Firebase env vars are missing. The UI will mount but " +
      "auth, Firestore, Storage, and Functions calls will fail. " +
      "Copy .env.example to .env.local and fill in your Firebase config.",
  );
}

export const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(
  app,
  env.VITE_FUNCTIONS_REGION ?? "us-east1",
);

if (firebaseConfigured && env.VITE_USE_EMULATORS === "true") {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  connectStorageEmulator(storage, "127.0.0.1", 9199);
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
}
