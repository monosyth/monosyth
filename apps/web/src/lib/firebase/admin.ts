import { applicationDefault, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

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

export function getFirebaseAdminStorageBucket() {
  const app = getFirebaseAdminApp();
  const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim();

  return bucketName ? getStorage(app).bucket(bucketName) : getStorage(app).bucket();
}
