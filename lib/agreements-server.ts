import { getAgreementByToken } from "@/lib/agreements";
import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

type AgreementStatusPayload = {
  status: "draft" | "signing" | "signed";
  signedAt: string | null;
  signProvider: string | null;
};

function getAdminApp() {
  if (getApps().length) {
    return getApps()[0];
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (projectId && clientEmail && privateKey) {
    return initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  }

  return initializeApp({
    credential: applicationDefault(),
    projectId: projectId || undefined,
  });
}

function normalizeSignedAt(value: unknown) {
  if (!value || typeof value !== "object") {
    return null;
  }

  if (
    "toDate" in (value as { toDate?: unknown }) &&
    typeof (value as { toDate?: () => Date }).toDate === "function"
  ) {
    const date = (value as { toDate: () => Date }).toDate();
    return date.toISOString();
  }

  return null;
}

async function getAgreementStatusByTokenAdmin(token: string): Promise<AgreementStatusPayload | null> {
  const app = getAdminApp();
  const db = getFirestore(app);
  const snapshot = await db
    .collection("agreements")
    .where("token", "==", token)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const data = snapshot.docs[0].data() as {
    status?: "draft" | "signing" | "signed";
    signedAt?: unknown;
    signProvider?: string;
  };

  return {
    status: data.status ?? "draft",
    signedAt: normalizeSignedAt(data.signedAt),
    signProvider: data.signProvider ?? null,
  };
}

async function getAgreementStatusByTokenFallback(token: string): Promise<AgreementStatusPayload | null> {
  const agreement = await getAgreementByToken(token);

  if (!agreement) {
    return null;
  }

  return {
    status: agreement.status,
    signedAt: agreement.signedAt ?? null,
    signProvider: agreement.signProvider ?? null,
  };
}

export async function getAgreementStatusByTokenServer(token: string) {
  try {
    return await getAgreementStatusByTokenAdmin(token);
  } catch {
    return getAgreementStatusByTokenFallback(token);
  }
}
