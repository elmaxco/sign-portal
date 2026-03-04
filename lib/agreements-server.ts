import { getAgreementByToken } from "@/lib/agreements";
import { getAdminDb } from "@/lib/firebase-admin";
import { serverTimestamp } from "firebase-admin/firestore";

type AgreementStatusPayload = {
  status: "draft" | "signing" | "signed";
  signedAt: string | null;
  signProvider: string | null;
};

type FirestoreAgreementDoc = {
  status?: "draft" | "signing" | "signed";
  signedAt?: unknown;
  signProvider?: string;
  ticState?: string;
  ticStartedAt?: { toDate?: () => Date };
};

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
  const db = getAdminDb();
  const snapshot = await db
    .collection("agreements")
    .where("token", "==", token)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const data = snapshot.docs[0].data() as FirestoreAgreementDoc;

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

export async function getAgreementLifecycleByTokenServer(token: string) {
  const db = getAdminDb();
  const snapshot = await db
    .collection("agreements")
    .where("token", "==", token)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const data = snapshot.docs[0].data() as FirestoreAgreementDoc;
  const ticStartedAt = data.ticStartedAt?.toDate?.();

  return {
    status: data.status ?? "draft",
    ticState: data.ticState ?? "",
    ticStartedAtMs: ticStartedAt ? ticStartedAt.getTime() : null,
  };
}

export async function markAgreementSigningByTokenServer(input: {
  token: string;
  ticState: string;
}) {
  const db = getAdminDb();
  const snapshot = await db
    .collection("agreements")
    .where("token", "==", input.token)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return false;
  }

  await snapshot.docs[0].ref.update({
    status: "signing",
    ticState: input.ticState,
    ticStartedAt: serverTimestamp(),
  });

  return true;
}

export async function markAgreementSignedByTicStateServer(input: {
  ticState: string;
  signProvider?: string;
  sessionId?: string;
  result?: string;
}) {
  const db = getAdminDb();
  const snapshot = await db
    .collection("agreements")
    .where("ticState", "==", input.ticState)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return false;
  }

  const minimalReceipt = {
    sessionId: input.sessionId ?? "",
    result: input.result ?? "",
  };

  await snapshot.docs[0].ref.update({
    status: "signed",
    signedAt: serverTimestamp(),
    signProvider: input.signProvider ?? "id.tic.io",
    signProof: JSON.stringify(minimalReceipt),
  });

  return true;
}

export async function markAgreementFailedByTicStateServer(input: {
  ticState: string;
  errorCode?: string;
  errorMessage?: string;
}) {
  const db = getAdminDb();
  const snapshot = await db
    .collection("agreements")
    .where("ticState", "==", input.ticState)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return false;
  }

  await snapshot.docs[0].ref.update({
    status: "draft",
    signFailedAt: serverTimestamp(),
    signErrorCode: input.errorCode ?? "FAILED",
    signErrorMessage: input.errorMessage ?? "Signering misslyckades eller avbröts.",
  });

  return true;
}
