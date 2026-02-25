import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  updateDoc,
  serverTimestamp,
  where,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export type AgreementStatus = "draft" | "signed";

export type Agreement = {
  id: string;
  title: string;
  content: string;
  token: string;
  status: AgreementStatus;
  createdAt: string;
  signedAt?: string;
  signProvider?: string;
  signProof?: string;
};

type FirestoreAgreement = {
  title?: string;
  content?: string;
  token?: string;
  status?: AgreementStatus;
  createdAt?: { toDate?: () => Date };
  signedAt?: { toDate?: () => Date };
  signProvider?: string;
  signProof?: string;
};

function mapAgreement(doc: QueryDocumentSnapshot): Agreement {
  const data = doc.data() as FirestoreAgreement;
  const createdAtDate = data.createdAt?.toDate?.();
  const signedAtDate = data.signedAt?.toDate?.();

  return {
    id: doc.id,
    title: data.title ?? "",
    content: data.content ?? "",
    token: data.token ?? "",
    status: data.status ?? "draft",
    createdAt: createdAtDate ? createdAtDate.toISOString() : "",
    signedAt: signedAtDate ? signedAtDate.toISOString() : undefined,
    signProvider: data.signProvider,
    signProof: data.signProof,
  };
}

export function generateAgreementToken() {
  const values = new Uint8Array(16);
  crypto.getRandomValues(values);
  return Array.from(values, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function createAgreement(input: { title: string; content: string }) {
  const token = generateAgreementToken();

  const docRef = await addDoc(collection(db, "agreements"), {
    title: input.title,
    content: input.content,
    token,
    status: "draft",
    createdAt: serverTimestamp(),
  });

  return { id: docRef.id, token };
}

export async function getAgreementByToken(token: string) {
  const agreementQuery = query(
    collection(db, "agreements"),
    where("token", "==", token),
    limit(1),
  );

  const snapshot = await getDocs(agreementQuery);

  if (snapshot.empty) {
    return null;
  }

  return mapAgreement(snapshot.docs[0]);
}

export async function listLatestAgreements(maxItems = 20) {
  const agreementsQuery = query(
    collection(db, "agreements"),
    orderBy("createdAt", "desc"),
    limit(maxItems),
  );

  const snapshot = await getDocs(agreementsQuery);
  return snapshot.docs.map(mapAgreement);
}

export async function markAgreementSignedByToken(input: {
  token: string;
  signProvider?: string;
  signProof?: string;
}) {
  const agreementQuery = query(
    collection(db, "agreements"),
    where("token", "==", input.token),
    limit(1),
  );

  const snapshot = await getDocs(agreementQuery);

  if (snapshot.empty) {
    return false;
  }

  await updateDoc(snapshot.docs[0].ref, {
    status: "signed",
    signedAt: serverTimestamp(),
    signProvider: input.signProvider ?? "id.tic.io",
    signProof: input.signProof ?? "",
  });

  return true;
}
