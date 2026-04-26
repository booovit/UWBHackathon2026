import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

if (getApps().length === 0) {
  initializeApp();
}

export const db = getFirestore();
try {
  db.settings({ ignoreUndefinedProperties: true });
} catch {
  // settings() can only be called once per Firestore instance; ignore if already set.
}
export const storage = getStorage();
