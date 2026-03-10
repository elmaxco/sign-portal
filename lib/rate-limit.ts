import { getAdminDb } from "@/lib/firebase-admin";

type RateLimitInput = {
  namespace: string;
  key: string;
  windowMs: number;
  maxHits: number;
};

type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
};

function sanitizePart(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 120) || "unknown";
}

function buildDocId(namespace: string, key: string) {
  return `${sanitizePart(namespace)}__${sanitizePart(key)}`;
}

export async function consumeRateLimit(input: RateLimitInput): Promise<RateLimitResult> {
  const db = getAdminDb();
  const now = Date.now();
  const windowMs = Math.max(1_000, Math.floor(input.windowMs));
  const maxHits = Math.max(1, Math.floor(input.maxHits));
  const docRef = db.collection("rate_limits").doc(buildDocId(input.namespace, input.key));

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(docRef);

    if (!snap.exists) {
      tx.set(docRef, {
        namespace: input.namespace,
        key: input.key,
        count: 1,
        windowStartMs: now,
        windowEndMs: now + windowMs,
        updatedAtMs: now,
      });

      return { allowed: true, retryAfterSeconds: 0 };
    }

    const data = snap.data() as {
      count?: number;
      windowStartMs?: number;
      windowEndMs?: number;
    };

    const windowEndMs = typeof data.windowEndMs === "number" ? data.windowEndMs : 0;

    if (windowEndMs <= now) {
      tx.set(
        docRef,
        {
          namespace: input.namespace,
          key: input.key,
          count: 1,
          windowStartMs: now,
          windowEndMs: now + windowMs,
          updatedAtMs: now,
        },
        { merge: true },
      );

      return { allowed: true, retryAfterSeconds: 0 };
    }

    const count = typeof data.count === "number" ? data.count : 0;

    if (count >= maxHits) {
      const retryAfterSeconds = Math.max(1, Math.ceil((windowEndMs - now) / 1000));
      return { allowed: false, retryAfterSeconds };
    }

    tx.set(
      docRef,
      {
        count: count + 1,
        updatedAtMs: now,
      },
      { merge: true },
    );

    return { allowed: true, retryAfterSeconds: 0 };
  });
}
