import { randomBytes } from "node:crypto";
import { getAdminDb } from "@/lib/firebase-admin";

export async function acquireCronLock(input: { lockName: string; ttlMs: number }) {
  const db = getAdminDb();
  const nowMs = Date.now();
  const ttlMs = Math.max(5_000, input.ttlMs);
  const holder = randomBytes(8).toString("hex");
  const lockRef = db.collection("systemLocks").doc(input.lockName);

  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(lockRef);

    if (snap.exists) {
      const data = snap.data() as { expiresAtMs?: number; holder?: string };
      const expiresAtMs = typeof data.expiresAtMs === "number" ? data.expiresAtMs : 0;

      if (expiresAtMs > nowMs) {
        return { acquired: false as const, holder: data.holder ?? null, expiresAtMs };
      }
    }

    tx.set(lockRef, {
      holder,
      acquiredAtMs: nowMs,
      expiresAtMs: nowMs + ttlMs,
      updatedAtMs: nowMs,
    });

    return { acquired: true as const, holder, expiresAtMs: nowMs + ttlMs };
  });

  return result;
}

export async function releaseCronLock(input: { lockName: string; holder: string }) {
  const db = getAdminDb();
  const lockRef = db.collection("systemLocks").doc(input.lockName);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(lockRef);

    if (!snap.exists) {
      return;
    }

    const data = snap.data() as { holder?: string };

    if (data.holder !== input.holder) {
      return;
    }

    tx.delete(lockRef);
  });
}
