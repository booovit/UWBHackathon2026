import { HttpsError } from "firebase-functions/v2/https";

export function requireAuth(uid: string | undefined): asserts uid is string {
  if (!uid) {
    throw new HttpsError("unauthenticated", "You must be signed in.");
  }
}

export function requireOwnership(ownerUid: string, callerUid: string): void {
  if (ownerUid !== callerUid) {
    throw new HttpsError(
      "permission-denied",
      "You do not have access to this resource.",
    );
  }
}

export function badRequest(message: string): never {
  throw new HttpsError("invalid-argument", message);
}
