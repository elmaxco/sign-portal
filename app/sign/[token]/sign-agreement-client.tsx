"use client";

import { useEffect, useState } from "react";

type Agreement = {
  id: string;
  title: string;
  content: string;
  token: string;
  links?: Array<{ title: string; url: string }>;
  attachments?: Array<{
    id: string;
    filename: string;
    contentType: string;
    size: number;
    storagePath: string;
    createdAt: string;
    uploadedBy: "admin";
  }>;
  attachmentCount?: number;
  status: "draft" | "signing" | "signed";
  createdAt: string;
  signedAt?: string;
  signProvider?: string;
};

type SignAgreementClientProps = {
  token: string;
};

const SIGNING_TIMEOUT_MS = 5 * 60 * 1000;

function formatAttachmentSize(size: number) {
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${Math.ceil(size / 1024)} KB`;
}

export default function SignAgreementClient({ token }: SignAgreementClientProps) {
  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [status, setStatus] = useState("Laddar avtal...");
  const [startSigningError, setStartSigningError] = useState("");
  const [pendingFromCallback, setPendingFromCallback] = useState(false);
  const [isPollingActive, setIsPollingActive] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadAgreement() {
      try {
        const response = await fetch(`/api/agreements/by-token?token=${encodeURIComponent(token)}`, {
          method: "GET",
          cache: "no-store",
        });

        const payload = (await response.json()) as {
          agreement?: Agreement;
          error?: string;
        };

        if (!response.ok) {
          if (!active) {
            return;
          }

          setAgreement(null);
          setStatus(payload.error ?? "Avtal hittades inte.");
          return;
        }

        const result = payload.agreement ?? null;

        if (!active) {
          return;
        }

        if (!result) {
          setAgreement(null);
          setStatus("Avtal hittades inte.");
          return;
        }

        setAgreement(result);
        setStatus("");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";

        if (!active) {
          return;
        }

        setAgreement(null);
        setStatus(`Kunde inte läsa avtal: ${message}`);
      }
    }

    loadAgreement();

    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const bankid = params.get("bankid");

    if (bankid === "success") {
      setStatus("Signering registrerad.");
      return;
    }

    if (bankid === "failed") {
      setStatus("Signering avbröts eller misslyckades.");
      return;
    }

    if (bankid === "pending") {
      setStatus("Signering pågår fortfarande. Vänta och prova att uppdatera sidan.");
      setPendingFromCallback(true);
      return;
    }

    if (bankid === "invalid_state") {
      setStatus("Ogiltig callback-state. Starta signeringen igen.");
      return;
    }

    if (bankid === "unknown") {
      setStatus("Callback mottagen men status kunde inte tolkas.");
    }
  }, []);

  useEffect(() => {
    const needsPolling = pendingFromCallback || agreement?.status === "signing";

    if (!needsPolling || agreement?.status === "signed") {
      setIsPollingActive(false);
      return;
    }

    let attempts = 0;
    let inFlight = false;
    let active = true;
    const maxAttempts = 90;
    let intervalId: number | null = null;

    function stopPolling() {
      active = false;
      setIsPollingActive(false);

      if (intervalId !== null) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
    }

    async function pollStatus() {
      if (!active || inFlight) {
        return;
      }

      inFlight = true;

      try {
        const response = await fetch(`/api/agreements/lifecycle?token=${encodeURIComponent(token)}`, {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          attempts += 1;

          if (attempts >= maxAttempts && active) {
            setStatus("Kunde inte verifiera signering i tid. Uppdatera sidan och försök igen.");
            setPendingFromCallback(false);
          }

          return;
        }

        const data = (await response.json()) as {
          status: "draft" | "signing" | "signed";
          ticStartedAtMs?: number | null;
          ticState?: string | null;
          signedAt?: string | null;
          signProvider?: string | null;
        };

        if (!active) {
          return;
        }

        setAgreement((previous) => {
          if (!previous) {
            return previous;
          }

          return {
            ...previous,
            status: data.status,
            signedAt: data.signedAt ?? previous.signedAt,
            signProvider: data.signProvider ?? previous.signProvider,
          };
        });

        if (data.status === "signed") {
          setStatus("Signering registrerad.");
          setPendingFromCallback(false);

          const url = new URL(window.location.href);

          if (url.searchParams.has("bankid")) {
            url.searchParams.delete("bankid");
            window.history.replaceState({}, "", url.toString());
          }

          stopPolling();
          return;
        }

        if (
          data.status === "signing" &&
          typeof data.ticStartedAtMs === "number" &&
          Date.now() - data.ticStartedAtMs > SIGNING_TIMEOUT_MS
        ) {
          await fetch(`/api/agreements/reset?token=${encodeURIComponent(token)}`, {
            method: "POST",
            cache: "no-store",
          });

          setAgreement((previous) => {
            if (!previous) {
              return previous;
            }

            return {
              ...previous,
              status: "draft",
            };
          });

          setStatus("Tiden gick ut. Försök igen.");
          setPendingFromCallback(false);
          stopPolling();
          return;
        }

        if (data.status === "draft") {
          setStatus("Signering avbröts eller återställdes.");
          setPendingFromCallback(false);
          stopPolling();
          return;
        }

        setStatus("Signering pågår. Status uppdateras automatiskt...");
      } catch {
        attempts += 1;

        if (attempts >= maxAttempts && active) {
          setStatus("Kunde inte verifiera signering i tid. Uppdatera sidan och försök igen.");
          setPendingFromCallback(false);
        }
      } finally {
        inFlight = false;
      }
    }

    pollStatus();
    setIsPollingActive(true);
    intervalId = window.setInterval(pollStatus, 2000);

    return () => {
      stopPolling();
    };
  }, [agreement?.status, pendingFromCallback, token]);

  function handleCancelOrRetry() {
    if (typeof window === "undefined") {
      return;
    }

    const url = new URL(window.location.href);

    if (url.searchParams.has("bankid")) {
      url.searchParams.delete("bankid");
      window.history.replaceState({}, "", url.toString());
    }

    setPendingFromCallback(false);
    setStatus("Signering avbröts. Du kan försöka igen.");
  }

  async function handleStartSigning() {
    setStartSigningError("");

    try {
      const response = await fetch("/api/tic/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          redirectUrl: window.location.href,
        }),
      });

      const data = (await response.json()) as { redirectUrl?: string; error?: string };

      if (!response.ok || !data.redirectUrl) {
        setStartSigningError(data.error ?? "Kunde inte starta signering.");
        return;
      }

      window.location.assign(data.redirectUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setStartSigningError(`Kunde inte starta signering: ${message}`);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-6 py-12">
      <h1 className="text-2xl font-semibold">Signering</h1>

      {status ? <p className="text-sm">{status}</p> : null}

      {agreement ? (
        <article className="rounded-md border p-4">
          <h2 className="text-xl font-semibold">{agreement.title}</h2>
          <p className="mt-3 whitespace-pre-wrap">{agreement.content}</p>

          {agreement.links?.length ? (
            <section className="mt-4 rounded-md border p-3">
              <h3 className="text-sm font-medium">Bilagor / lankat innehall</h3>
              <ul className="mt-2 space-y-1 text-sm">
                {agreement.links.map((link, index) => (
                  <li key={`${link.url}-${index}`}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      {link.title}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {agreement.attachments?.length ? (
            <section className="mt-4 rounded-md border p-3">
              <h3 className="text-sm font-medium">Bilagor</h3>
              <ul className="mt-2 space-y-2 text-sm">
                {agreement.attachments.map((attachment) => (
                  <li key={attachment.id} className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{attachment.filename}</p>
                      <p className="text-xs text-muted-foreground">
                        {attachment.contentType} - {formatAttachmentSize(attachment.size)}
                      </p>
                    </div>
                    <a
                      href={`/api/agreements/attachments/download?token=${encodeURIComponent(token)}&attachmentId=${encodeURIComponent(attachment.id)}`}
                      className="rounded-md border px-3 py-1 text-xs"
                    >
                      Ladda ner
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <p className="mt-4 text-sm">
            Status:{" "}
            {agreement.status === "signed"
              ? "Signerad"
              : agreement.status === "signing"
                ? "Signering pågår"
                : "Ej signerad"}
          </p>
          {agreement.status !== "signed" ? (
            <div className="mt-4">
              <button
                type="button"
                onClick={handleStartSigning}
                className="inline-flex rounded-md bg-foreground px-4 py-2 text-background"
              >
                Signera med BankID
              </button>

              {isPollingActive ? (
                <div className="mt-3 flex items-center gap-2 text-sm">
                  <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-foreground" />
                  <span>Väntar på BankID...</span>
                </div>
              ) : null}

              {isPollingActive ? (
                <button
                  type="button"
                  onClick={handleCancelOrRetry}
                  className="mt-2 inline-flex rounded-md border px-3 py-1 text-sm"
                >
                  Avbryt / Försök igen
                </button>
              ) : null}

              {startSigningError ? <p className="mt-2 text-sm">{startSigningError}</p> : null}
            </div>
          ) : null}
        </article>
      ) : null}
    </main>
  );
}
