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
};

function mapOffer(id: string, data: FirestoreOffer): OfferListItem {
  const createdAt = data.createdAt?.toDate?.();
  const convertedAt = data.convertedToAgreementAt?.toDate?.();

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
