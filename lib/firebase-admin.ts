import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

type ServiceAccountLike = {
  project_id?: string;
  client_email?: string;
  private_key?: string;
};

function getPrivateKey() {
  return process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
}

function getServiceAccountFromJsonEnv() {
  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (!rawJson) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawJson) as ServiceAccountLike;
    const projectId = parsed.project_id || process.env.FIREBASE_PROJECT_ID;
    const clientEmail = parsed.client_email || process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = parsed.private_key?.replace(/\\n/g, "\n") || getPrivateKey();

    if (!projectId || !clientEmail || !privateKey) {
      return null;
    }

    return { projectId, clientEmail, privateKey };
  } catch {
    return null;
  }
}

function getCredentialedApp() {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = getPrivateKey();

  const serviceAccountFromJson = getServiceAccountFromJsonEnv();

  if (serviceAccountFromJson) {
    return initializeApp({
      credential: cert({
        projectId: serviceAccountFromJson.projectId,
        clientEmail: serviceAccountFromJson.clientEmail,
        privateKey: serviceAccountFromJson.privateKey,
      }),
      storageBucket: storageBucket || undefined,
    });
  }

  if (projectId && clientEmail && privateKey) {
    return initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      storageBucket: storageBucket || undefined,
    });
  }

  return initializeApp({
    credential: applicationDefault(),
    projectId: projectId || undefined,
    storageBucket: storageBucket || undefined,
  });
}

export function getAdminApp() {
  if (getApps().length) {
    return getApps()[0];
  }

  return getCredentialedApp();
}

export function getAdminDb() {
  return getFirestore(getAdminApp());
}

export function getAdminBucket() {
  const bucketName = process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

  if (!bucketName) {
    throw new Error("Missing FIREBASE_STORAGE_BUCKET for attachment storage.");
  }

  return getStorage(getAdminApp()).bucket(bucketName);
}