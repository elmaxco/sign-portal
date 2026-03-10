import { getAgreementByToken } from "@/lib/agreements";
import { getAdminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { randomBytes } from "node:crypto";
import {
  MAX_ATTACHMENTS_PER_AGREEMENT,
  type AttachmentItem,
} from "@/lib/attachments";

type AgreementStatusPayload = {
  status: "draft" | "signing" | "signed";
  signedAt: string | null;
  signProvider: string | null;
};

export type AgreementLinkItem = {
  title: string;
  url: string;
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
  links?: Array<{ title?: string; url?: string }>;
  attachments?: Array<{
    id?: string;
    filename?: string;
    contentType?: string;
    size?: number;
    storagePath?: string;
    createdAt?: { toDate?: () => Date };
    uploadedBy?: "admin";
  }>;
  attachmentCount?: number;
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
  links: AgreementLinkItem[];
  attachments: AttachmentItem[];
  attachmentCount: number;
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
  links: AgreementLinkItem[];
  attachments: AttachmentItem[];
  attachmentCount: number;
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
  links?: AgreementLinkItem[];
  attachments?: AttachmentItem[];
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
    links: (input.links ?? []).map((link) => ({
      title: link.title,
      url: link.url,
    })),
    attachments: (input.attachments ?? []).map((attachment) => ({
      id: attachment.id,
      filename: attachment.filename,
      contentType: attachment.contentType,
      size: attachment.size,
      storagePath: attachment.storagePath,
      createdAt: new Date(attachment.createdAt),
      uploadedBy: attachment.uploadedBy,
    })),
    attachmentCount: input.attachments?.length ?? 0,
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
      links: normalizeLinks(data.links),
      attachments: normalizeAttachments(data.attachments),
      attachmentCount: normalizeAttachmentCount(data),
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
    links: normalizeLinks(data.links),
    attachments: normalizeAttachments(data.attachments),
    attachmentCount: normalizeAttachmentCount(data),
  };
}

function normalizeAttachmentCount(data: FirestoreAgreementDoc) {
  if (typeof data.attachmentCount === "number" && data.attachmentCount >= 0) {
    return data.attachmentCount;
  }

  return normalizeAttachments(data.attachments).length;
}

function normalizeAttachments(value: unknown): AttachmentItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const maybeObj = item as {
        id?: unknown;
        filename?: unknown;
        contentType?: unknown;
        size?: unknown;
        storagePath?: unknown;
        createdAt?: unknown;
        uploadedBy?: unknown;
      };

      const id = typeof maybeObj.id === "string" ? maybeObj.id.trim() : "";
      const filename = typeof maybeObj.filename === "string" ? maybeObj.filename.trim() : "";
      const contentType = typeof maybeObj.contentType === "string" ? maybeObj.contentType.trim() : "";
      const size = typeof maybeObj.size === "number" ? maybeObj.size : -1;
      const storagePath = typeof maybeObj.storagePath === "string" ? maybeObj.storagePath.trim() : "";
      const uploadedBy = maybeObj.uploadedBy === "admin" ? "admin" : null;
      const createdAtIso = normalizeTimestamp(maybeObj.createdAt);

      if (!id || !filename || !contentType || size < 0 || !storagePath || !createdAtIso || !uploadedBy) {
        return null;
      }

      return {
        id,
        filename,
        contentType,
        size,
        storagePath,
        createdAt: createdAtIso,
        uploadedBy,
      };
    })
    .filter((item): item is AttachmentItem => item !== null);
}

export async function addAgreementAttachmentByTokenServer(input: {
  token: string;
  attachment: AttachmentItem;
}) {
  const db = getAdminDb();

  return db.runTransaction(async (tx) => {
    const snapshot = await tx.get(
      db.collection("agreements").where("token", "==", input.token).limit(1),
    );

    if (snapshot.empty) {
      return { ok: false as const, reason: "not_found" as const };
    }

    const doc = snapshot.docs[0];
    const data = doc.data() as FirestoreAgreementDoc;
    const attachments = normalizeAttachments(data.attachments);

    if (attachments.some((attachment) => attachment.id === input.attachment.id)) {
      return { ok: false as const, reason: "duplicate_id" as const };
    }

    if (attachments.length >= MAX_ATTACHMENTS_PER_AGREEMENT) {
      return { ok: false as const, reason: "max_reached" as const };
    }

    const nextAttachments = [
      ...attachments,
      {
        ...input.attachment,
        createdAt: new Date(input.attachment.createdAt),
      },
    ];

    tx.update(doc.ref, {
      attachments: nextAttachments,
      attachmentCount: nextAttachments.length,
      updatedAt: FieldValue.serverTimestamp(),
    });

    tx.set(
      doc.ref.collection("agreementEvents").doc(),
      {
        type: "attachment_uploaded",
        attachmentId: input.attachment.id,
        filename: input.attachment.filename,
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return { ok: true as const, agreementId: doc.id, attachmentCount: nextAttachments.length };
  });
}

export async function removeAgreementAttachmentByTokenServer(input: {
  token: string;
  attachmentId: string;
}) {
  const db = getAdminDb();

  return db.runTransaction(async (tx) => {
    const snapshot = await tx.get(
      db.collection("agreements").where("token", "==", input.token).limit(1),
    );

    if (snapshot.empty) {
      return { ok: false as const, reason: "not_found" as const };
    }

    const doc = snapshot.docs[0];
    const data = doc.data() as FirestoreAgreementDoc;
    const attachments = normalizeAttachments(data.attachments);
    const target = attachments.find((attachment) => attachment.id === input.attachmentId);

    if (!target) {
      return { ok: false as const, reason: "attachment_not_found" as const };
    }

    const nextAttachments = attachments.filter((attachment) => attachment.id !== input.attachmentId);

    tx.update(doc.ref, {
      attachments: nextAttachments,
      attachmentCount: nextAttachments.length,
      updatedAt: FieldValue.serverTimestamp(),
    });

    tx.set(
      doc.ref.collection("agreementEvents").doc(),
      {
        type: "attachment_deleted",
        attachmentId: target.id,
        filename: target.filename,
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    return {
      ok: true as const,
      agreementId: doc.id,
      storagePath: target.storagePath,
      attachmentCount: nextAttachments.length,
    };
  });
}

function normalizeLinks(value: unknown): AgreementLinkItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      const maybeObj = item as { title?: unknown; url?: unknown };
      const title = typeof maybeObj.title === "string" ? maybeObj.title.trim() : "";
      const url = typeof maybeObj.url === "string" ? maybeObj.url.trim() : "";

      if (!title || !url) {
        return null;
      }

      return { title, url };
    })
    .filter((item): item is AgreementLinkItem => item !== null);
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
