"use client";

import { useState } from "react";
import { addDoc, collection, getDocs, orderBy, query, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

type AgreementItem = {
  id: string;
  name: string;
  createdAt: string;
};

export default function FirestoreTestPage() {
  const [agreements, setAgreements] = useState<AgreementItem[]>([]);
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function createTestAgreement() {
    setLoading(true);
    setStatus("");

    try {
      const name = `Test agreement ${new Date().toISOString()}`;

      await addDoc(collection(db, "agreements"), {
        name,
        createdAt: serverTimestamp(),
      });

      setStatus("Created test agreement successfully.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setStatus(`Create failed: ${message}`);
    } finally {
      setLoading(false);
    }
  }

  async function loadAgreements() {
    setLoading(true);
    setStatus("");

    try {
      const agreementsQuery = query(collection(db, "agreements"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(agreementsQuery);

      const items: AgreementItem[] = snapshot.docs.map((doc) => {
        const data = doc.data() as { name?: string; createdAt?: { toDate?: () => Date } };
        const createdDate = data.createdAt?.toDate?.();

        return {
          id: doc.id,
          name: data.name ?? "(no name)",
          createdAt: createdDate ? createdDate.toISOString() : "(no timestamp yet)",
        };
      });

      setAgreements(items);
      setStatus(`Loaded ${items.length} agreement(s).`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setStatus(`Load failed: ${message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-6 py-12">
      <h1 className="text-2xl font-semibold">Firestore test</h1>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={createTestAgreement}
          disabled={loading}
          className="rounded-md bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          Create test agreement
        </button>

        <button
          type="button"
          onClick={loadAgreements}
          disabled={loading}
          className="rounded-md border border-black px-4 py-2 disabled:opacity-50"
        >
          Load agreements
        </button>
      </div>

      {status ? <p className="text-sm">{status}</p> : null}

      <ul className="space-y-2">
        {agreements.map((agreement) => (
          <li key={agreement.id} className="rounded-md border p-3 text-sm">
            <p className="font-medium">{agreement.name}</p>
            <p className="text-xs opacity-70">id: {agreement.id}</p>
            <p className="text-xs opacity-70">createdAt: {agreement.createdAt}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
