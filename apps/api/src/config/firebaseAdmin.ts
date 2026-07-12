import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage, type Storage } from "firebase-admin/storage";
import { env } from "./env";

/**
 * Lazily initialized so the API can boot (e.g. for the health check) even before Firebase
 * credentials are wired up in Phase 2. repositories/* are the only callers allowed to import this.
 */
let app: App | undefined;

function getApp(): App {
  if (getApps().length > 0) {
    return getApps()[0]!;
  }
  if (!env.firebase.projectId || !env.firebase.clientEmail || !env.firebase.privateKey) {
    throw new Error(
      "Firebase Admin credentials are not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, " +
        "FIREBASE_PRIVATE_KEY in apps/api/.env (see .env.example)."
    );
  }
  app = initializeApp({
    credential: cert({
      projectId: env.firebase.projectId,
      clientEmail: env.firebase.clientEmail,
      privateKey: env.firebase.privateKey,
    }),
  });
  return app;
}

export function getDb(): Firestore {
  return getFirestore(getApp());
}

export function getBucket(): Storage {
  return getStorage(getApp());
}
