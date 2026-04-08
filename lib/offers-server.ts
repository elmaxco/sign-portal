import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { createAgreementServer } from "@/lib/agreements-server";

type FirestoreOffer = {
  name?: string;
  email?: string;
  company?: string;
  orgNumber?: string;
  phone?: string;
  smsConsent?: boolean;
  packageName?: string;
  notes?: string;
  status?: "new" | "converted";
  createdAt?: { toDate?: () => Date };
  convertedToAgreementAt?: { toDate?: () => Date };
  agreementId?: string;
  agreementToken?: string;
  bankIdVerified?: boolean;
  bankIdVerifiedAt?: { toDate?: () => Date };
  bankIdSessionId?: string;
  bankIdProvider?: string;
  bankIdFullName?: string;
  bankIdPersonalNumber?: string;
};

export type OfferListItem = {
  id: string;
  name: string;
  email: string;
  company: string;
  orgNumber: string;
  phone: string;
  smsConsent: boolean;
  packageName: string;
  notes: string;
  status: "new" | "converted";
  createdAt: string;
  convertedToAgreementAt: string | null;
  agreementId: string | null;
  agreementToken: string | null;
  bankIdVerified: boolean;
  bankIdVerifiedAt: string | null;
  bankIdSessionId: string;
  bankIdProvider: string;
  bankIdFullName: string;
  bankIdPersonalNumber: string;
};

export type DeleteOfferByIdServerResult =
  | { ok: true; offerId: string }
  | { ok: false; reason: "not_found" };

function mapOffer(id: string, data: FirestoreOffer): OfferListItem {
  const createdAt = data.createdAt?.toDate?.();
  const convertedAt = data.convertedToAgreementAt?.toDate?.();
  const bankIdVerifiedAt = data.bankIdVerifiedAt?.toDate?.();

  return {
    id,
    name: data.name ?? "",
    email: data.email ?? "",
    company: data.company ?? "",
    orgNumber: data.orgNumber ?? "",
    phone: data.phone ?? "",
    smsConsent: data.smsConsent === true,
    packageName: data.packageName ?? "",
    notes: data.notes ?? "",
    status: data.status ?? "new",
    createdAt: createdAt ? createdAt.toISOString() : "",
    convertedToAgreementAt: convertedAt ? convertedAt.toISOString() : null,
    agreementId: data.agreementId ?? null,
    agreementToken: data.agreementToken ?? null,
    bankIdVerified: data.bankIdVerified === true,
    bankIdVerifiedAt: bankIdVerifiedAt ? bankIdVerifiedAt.toISOString() : null,
    bankIdSessionId: data.bankIdSessionId ?? "",
    bankIdProvider: data.bankIdProvider ?? "",
    bankIdFullName: data.bankIdFullName ?? "",
    bankIdPersonalNumber: data.bankIdPersonalNumber ?? "",
  };
}

export async function createOfferServer(input: {
  name: string;
  email: string;
  company: string;
  orgNumber: string;
  phone: string;
  smsConsent?: boolean;
  packageName?: string;
  notes?: string;
  bankIdSessionId: string;
  bankIdProvider: string;
  bankIdVerifiedAtMs: number;
  bankIdFullName?: string;
  bankIdPersonalNumber?: string;
}) {
  const db = getAdminDb();

  const ref = await db.collection("offers").add({
    name: input.name,
    email: input.email,
    company: input.company,
    orgNumber: input.orgNumber,
    phone: input.phone,
    smsConsent: input.smsConsent === true,
    packageName: input.packageName ?? "",
    notes: input.notes ?? "",
    bankIdVerified: true,
    bankIdVerifiedAt: new Date(input.bankIdVerifiedAtMs),
    bankIdSessionId: input.bankIdSessionId,
    bankIdProvider: input.bankIdProvider,
    bankIdFullName: input.bankIdFullName ?? "",
    bankIdPersonalNumber: input.bankIdPersonalNumber ?? "",
    status: "new",
    createdAt: FieldValue.serverTimestamp(),
  });

  return { id: ref.id };
}

export async function listLatestOffersServer(maxItems = 100): Promise<OfferListItem[]> {
  const db = getAdminDb();
  const snapshot = await db
    .collection("offers")
    .orderBy("createdAt", "desc")
    .limit(maxItems)
    .get();

  return snapshot.docs.map((doc) => mapOffer(doc.id, doc.data() as FirestoreOffer));
}

export async function getOfferByIdServer(offerId: string): Promise<OfferListItem | null> {
  const db = getAdminDb();
  const doc = await db.collection("offers").doc(offerId).get();

  if (!doc.exists) {
    return null;
  }

  return mapOffer(doc.id, doc.data() as FirestoreOffer);
}

export async function createAgreementFromOfferServer(offerId: string) {
  const db = getAdminDb();
  const offerRef = db.collection("offers").doc(offerId);
  const offerDoc = await offerRef.get();

  if (!offerDoc.exists) {
    return null;
  }

  const offer = mapOffer(offerDoc.id, offerDoc.data() as FirestoreOffer);

  if (!offer.email) {
    throw new Error("Offer is missing customer email.");
  }

  const agreementTitle = `Avtal - ${offer.company || offer.name}`;
  const agreementContent = [
    `Kund: ${offer.name}`,
    `E-post: ${offer.email}`,
    `Företag: ${offer.company}`,
    `Org.nr: ${offer.orgNumber}`,
    `Telefon: ${offer.phone}`,
    offer.packageName ? `Paket: ${offer.packageName}` : "",
    offer.notes ? `Notering: ${offer.notes}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const createdAgreement = await createAgreementServer({
    title: agreementTitle,
    content: agreementContent,
    recipientEmail: offer.email,
    recipientPhone: offer.phone,
    recipientSmsConsent: offer.smsConsent,
  });

  await offerRef.update({
    status: "converted",
    convertedToAgreementAt: FieldValue.serverTimestamp(),
    agreementId: createdAgreement.id,
    agreementToken: createdAgreement.token,
  });

  return createdAgreement;
}

export async function deleteOfferByIdServer(
  offerId: string,
): Promise<DeleteOfferByIdServerResult> {
  const trimmedId = offerId.trim();

  if (!trimmedId) {
    return { ok: false, reason: "not_found" };
  }

  const db = getAdminDb();
  const offerRef = db.collection("offers").doc(trimmedId);
  const offerDoc = await offerRef.get();

  if (!offerDoc.exists) {
    return { ok: false, reason: "not_found" };
  }

  await offerRef.delete();

  return { ok: true, offerId: trimmedId };
}
