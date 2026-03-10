import { getAgreementByToken } from "@/lib/agreements";
import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { randomBytes } from "node:crypto";

type AgreementStatusPayload = {
  status: "draft" | "signing" | "signed";
  signedAt: string | null;
  signProvider: string | null;
};

type FirestoreAgreementDoc = {
  title?: string;
  content?: string;
  token?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  recipientSmsConsent?: boolean;
  status?: "draft" | "signing" | "signed";
  createdAt?: { toDate?: () => Date };
  signedAt?: unknown;
  sentAt?: unknown;
  reminderSentAt?: unknown;
  signProvider?: string;
  ticState?: string;
  ticStartedAt?: { toDate?: () => Date };
};

export type AgreementListItemServer = {
  id: string;
  title: string;
  token: string;
  recipientEmail: string | null;
  recipientPhone: string | null;
  recipientSmsConsent: boolean;
  status: "draft" | "signing" | "signed";
  createdAt: string;
  signedAt: string | null;
  sentAt: string | null;
  reminderSentAt: string | null;
};

export type AgreementByTokenServer = {
  id: string;
  title: string;
  content: string;
  token: string;
  recipientEmail: string | null;
  recipientPhone: string | null;
  recipientSmsConsent: boolean;
  status: "draft" | "signing" | "signed";
  createdAt: string;
  signedAt: string | null;
  sentAt: string | null;
  reminderSentAt: string | null;
  signProvider: string | null;
};

export type AgreementReminderCandidateServer = {
  id: string;
  token: string;
  title: string;
  recipientEmail: string;
  recipientPhone: string | null;
  recipientSmsConsent: boolean;
  status: "draft" | "signing";
  sentAt: string;
  reminderSentAt: string | null;
};

function generateAgreementTokenServer() {
  return randomBytes(16).toString("hex");
}

export async function createAgreementServer(input: {
  title: string;
  content: string;
  recipientEmail: string;
  recipientPhone?: string;
  recipientSmsConsent?: boolean;
}) {
  const db = getAdminDb();
  const token = generateAgreementTokenServer();

  const docRef = await db.collection("agreements").add({
    title: input.title,
    content: input.content,
    token,
    recipientEmail: input.recipientEmail,
    recipientPhone: input.recipientPhone ?? "",
    recipientSmsConsent: input.recipientSmsConsent === true,
    status: "draft",
    createdAt: FieldValue.serverTimestamp(),
  });

  return { id: docRef.id, token };
}

export async function listLatestAgreementsServer(maxItems = 20): Promise<AgreementListItemServer[]> {
  const db = getAdminDb();
  const snapshot = await db
    .collection("agreements")
    .orderBy("createdAt", "desc")
    .limit(maxItems)
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data() as FirestoreAgreementDoc;
    const createdAt = data.createdAt?.toDate?.();

    return {
      id: doc.id,
      title: data.title ?? "",
      token: data.token ?? "",
      recipientEmail: data.recipientEmail ?? null,
      recipientPhone: data.recipientPhone ?? null,
      recipientSmsConsent: data.recipientSmsConsent === true,
      status: data.status ?? "draft",
      createdAt: createdAt ? createdAt.toISOString() : "",
      signedAt: normalizeTimestamp(data.signedAt),
      sentAt: normalizeTimestamp(data.sentAt),
      reminderSentAt: normalizeTimestamp(data.reminderSentAt),
    };
  });
}

export async function getAgreementByTokenServer(token: string): Promise<AgreementByTokenServer | null> {
  const db = getAdminDb();
  const snapshot = await db
    .collection("agreements")
    .where("token", "==", token)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  const data = doc.data() as FirestoreAgreementDoc;
  const createdAt = data.createdAt?.toDate?.();

  return {
    id: doc.id,
    title: data.title ?? "",
    content: data.content ?? "",
    token: data.token ?? "",
    recipientEmail: data.recipientEmail ?? null,
    recipientPhone: data.recipientPhone ?? null,
    recipientSmsConsent: data.recipientSmsConsent === true,
    status: data.status ?? "draft",
    createdAt: createdAt ? createdAt.toISOString() : "",
    signedAt: normalizeTimestamp(data.signedAt),
    sentAt: normalizeTimestamp(data.sentAt),
    reminderSentAt: normalizeTimestamp(data.reminderSentAt),
    signProvider: data.signProvider ?? null,
  };
}

export async function listAutomaticReminderCandidatesServer(input: {
  firstReminderAfterMinutes: number;
  reminderIntervalMinutes: number;
  maxItems?: number;
  nowMs?: number;
}) {
  const db = getAdminDb();
  const maxItems = Math.max(1, Math.min(input.maxItems ?? 100, 500));
  const firstReminderAfterMs = Math.max(1, input.firstReminderAfterMinutes) * 60 * 1000;
  const reminderIntervalMs = Math.max(1, input.reminderIntervalMinutes) * 60 * 1000;
  const nowMs = input.nowMs ?? Date.now();

  const snapshot = await db
    .collection("agreements")
    .where("status", "in", ["draft", "signing"])
    .limit(maxItems * 5)
    .get();

  const candidates: AgreementReminderCandidateServer[] = [];

  for (const doc of snapshot.docs) {
    const data = doc.data() as FirestoreAgreementDoc;
    const status = data.status ?? "draft";

    if (status !== "draft" && status !== "signing") {
      continue;
    }

    const token = data.token ?? "";
    const recipientEmail = data.recipientEmail ?? "";
    const recipientPhone = data.recipientPhone ?? "";
    const recipientSmsConsent = data.recipientSmsConsent === true;

    if (!token || !recipientEmail) {
      continue;
    }

    const sentAtIso = normalizeTimestamp(data.sentAt);

    if (!sentAtIso) {
      continue;
    }

    const sentAtMs = new Date(sentAtIso).getTime();

    if (!Number.isFinite(sentAtMs)) {
      continue;
    }

    const reminderSentAtIso = normalizeTimestamp(data.reminderSentAt);
    const reminderSentAtMs = reminderSentAtIso ? new Date(reminderSentAtIso).getTime() : null;

    const shouldSend =
      reminderSentAtMs === null
        ? nowMs - sentAtMs >= firstReminderAfterMs
        : nowMs - reminderSentAtMs >= reminderIntervalMs;

    if (!shouldSend) {
      continue;
    }

    candidates.push({
      id: doc.id,
      token,
      title: data.title ?? "",
      recipientEmail,
      recipientPhone: recipientPhone || null,
      recipientSmsConsent,
      status,
      sentAt: sentAtIso,
      reminderSentAt: reminderSentAtIso,
    });

    if (candidates.length >= maxItems) {
      break;
    }
  }

  return candidates;
}

function normalizeTimestamp(value: unknown) {
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
    signedAt: normalizeTimestamp(data.signedAt),
    signProvider: data.signProvider ?? null,
  };
}

export async function markAgreementEmailSentByTokenServer(input: { token: string }) {
  const db = getAdminDb();
  const snapshot = await db
    .collection("agreements")
    .where("token", "==", input.token)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return { updated: false, wasReminder: false };
  }

  const data = snapshot.docs[0].data() as FirestoreAgreementDoc;
  const hasPreviousSend = Boolean(normalizeTimestamp(data.sentAt));

  await snapshot.docs[0].ref.update({
    ...(hasPreviousSend
      ? { reminderSentAt: FieldValue.serverTimestamp() }
      : { sentAt: FieldValue.serverTimestamp() }),
  });

  return { updated: true, wasReminder: hasPreviousSend };
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
    ticStartedAt: FieldValue.serverTimestamp(),
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
    signedAt: FieldValue.serverTimestamp(),
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
    signFailedAt: FieldValue.serverTimestamp(),
    signErrorCode: input.errorCode ?? "FAILED",
    signErrorMessage: input.errorMessage ?? "Signering misslyckades eller avbröts.",
  });

  return true;
}

export async function resetAgreementByTokenServer(input: {
  token: string;
  errorCode?: string;
  errorMessage?: string;
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
    status: "draft",
    ticState: "",
    ticStartedAt: FieldValue.delete(),
    signFailedAt: FieldValue.serverTimestamp(),
    signErrorCode: input.errorCode ?? "TIMEOUT",
    signErrorMessage: input.errorMessage ?? "Tiden gick ut. Försök igen.",
  });

  return true;
}

export async function resetTimedOutSigningsServer(input: {
  timeoutMs: number;
  nowMs?: number;
}) {
  const db = getAdminDb();
  const snapshot = await db
    .collection("agreements")
    .where("status", "==", "signing")
    .get();

  const nowMs = input.nowMs ?? Date.now();
  let resetCount = 0;

  const batch = db.batch();

  for (const doc of snapshot.docs) {
    const data = doc.data() as FirestoreAgreementDoc;
    const startedAtMs = data.ticStartedAt?.toDate?.()?.getTime();

    if (typeof startedAtMs !== "number") {
      continue;
    }

    if (nowMs - startedAtMs <= input.timeoutMs) {
      continue;
    }

    batch.update(doc.ref, {
      status: "draft",
      ticState: "",
      ticStartedAt: FieldValue.delete(),
      signFailedAt: FieldValue.serverTimestamp(),
      signErrorCode: "TIMEOUT",
      signErrorMessage: "Tiden gick ut. Försök igen.",
    });

    resetCount += 1;
  }

  if (resetCount > 0) {
    await batch.commit();
  }

  return {
    checked: snapshot.size,
    reset: resetCount,
  };
}
