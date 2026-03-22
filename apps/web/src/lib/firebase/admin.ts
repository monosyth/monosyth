import { applicationDefault, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function getFirebaseAdminApp() {
  if (getApps().length > 0) {
    return getApp();
  }

  return initializeApp({
    credential: applicationDefault(),
    projectId:
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() ||
      process.env.GCLOUD_PROJECT ||
      "monosyth",
  });
}

export function getFirebaseAdminDb() {
  return getFirestore(getFirebaseAdminApp());
}
