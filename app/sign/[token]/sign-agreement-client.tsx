"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

type AgreementAttachment = {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  storagePath: string;
  createdAt: string;
  uploadedBy: "admin";
};

type Agreement = {
  id: string;
  title: string;
  content: string;
  token: string;
  links?: Array<{ title: string; url: string }>;
  attachments?: AgreementAttachment[];
  attachmentCount?: number;
  status: "draft" | "signing" | "signed";
  createdAt: string;
  signedAt?: string;
  signProvider?: string;
  /** True när API döljer innehåll tills avtalet är signerat. */
  redactedForSigner?: boolean;
};

type SignAgreementClientProps = {
  token: string;
  entryMode?: "sign" | "signup";
};

const SIGNING_TIMEOUT_MS = 5 * 60 * 1000;

function formatAttachmentSize(size: number) {
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${Math.ceil(size / 1024)} KB`;
}


function isImageAttachment(attachment: AgreementAttachment) {
  return (
    attachment.contentType === "image/png" ||
    attachment.contentType === "image/jpeg"
  );
}

function isPdfAttachment(attachment: AgreementAttachment) {
  return attachment.contentType === "application/pdf";
}

function attachmentDownloadHref(token: string, attachmentId: string, intent?: "download" | "preview") {
  const query = new URLSearchParams({
    token,
    attachmentId,
  });

  if (intent === "preview") {
    query.set("intent", "preview");
  }

  return `/api/agreements/attachments/download?${query.toString()}`;
}

export default function SignAgreementClient({ token, entryMode = "sign" }: SignAgreementClientProps) {
  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [status, setStatus] = useState("Laddar avtal...");
  const [startSigningError, setStartSigningError] = useState("");
  const [isRestartingSigning, setIsRestartingSigning] = useState(false);
  const [restartSuggested, setRestartSuggested] = useState(false);
  /** BankID-sessionen löpte ut; servern är redan återställd – bara "Signera igen" behövs. */
  const [signingTimedOut, setSigningTimedOut] = useState(false);
  const [pendingFromCallback, setPendingFromCallback] = useState(false);
  const [isPollingActive, setIsPollingActive] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<AgreementAttachment | null>(null);
  const [downloadingAttachmentId, setDownloadingAttachmentId] = useState<string | null>(null);
  const isAgreementSigned = agreement?.status === "signed";

  const showSignerGate =
    Boolean(agreement?.redactedForSigner) && !isAgreementSigned;

  useEffect(() => {
    let active = true;

    async function loadAgreement() {
      try {
        const params = new URLSearchParams({ token });

        const response = await fetch(`/api/agreements/by-token?${params.toString()}`, {
          method: "GET",
          cache: "no-store",
        });

        const payload = (await response.json()) as {
          agreement?: Agreement;
          redactedForSigner?: boolean;
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

        const base = payload.agreement ?? null;

        if (!active) {
          return;
        }

        if (!base) {
          setAgreement(null);
          setStatus("Avtal hittades inte.");
          return;
        }

        const merged: Agreement = {
          ...base,
          redactedForSigner: payload.redactedForSigner === true,
        };

        setAgreement(merged);
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
    if (!previewAttachment) return;

    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setPreviewAttachment(null);
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [previewAttachment]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const bankid = params.get("bankid");

    if (bankid === "success") {
      setStatus("Signering klar. Avtalet är nu signerat.");
      setRestartSuggested(false);
      setSigningTimedOut(false);
      return;
    }

    if (bankid === "failed") {
      setStatus("Signeringen avbröts eller misslyckades. Starta om signeringen för att försöka igen.");
      setRestartSuggested(true);
      return;
    }

    if (bankid === "pending") {
      setStatus("Signeringen väntar fortfarande på svar från BankID. Du kan vänta kvar eller starta om signeringen.");
      setPendingFromCallback(true);
      setRestartSuggested(true);
      return;
    }

    if (bankid === "invalid_state") {
      setStatus("Ogiltigt callback-svar. Starta om signeringen och försök igen.");
      setRestartSuggested(true);
      return;
    }

    if (bankid === "agreement_not_found") {
      setStatus("Avtalet hittades inte. Kontrollera att länken är korrekt.");
      setRestartSuggested(false);
      return;
    }

    if (bankid === "unknown") {
      setStatus("Callback mottagen men status kunde inte tolkas.");
      setRestartSuggested(true);
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
          setStatus("Signering klar. Avtalet är nu signerat.");
          setPendingFromCallback(false);
          setRestartSuggested(false);
          setSigningTimedOut(false);

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

          setStatus("Tiden gick ut. Klicka på Signera igen med BankID för att försöka igen.");
          setPendingFromCallback(false);
          setRestartSuggested(true);
          setSigningTimedOut(true);
          stopPolling();
          return;
        }

        if (data.status === "draft") {
          setStatus("Signeringen avbröts eller återställdes. Klicka på Signera med BankID för att försöka igen.");
          setPendingFromCallback(false);
          setRestartSuggested(true);
          stopPolling();
          return;
        }

        setRestartSuggested(false);
        setStatus("Signering pågår. Status uppdateras automatiskt...");
      } catch {
        attempts += 1;

        if (attempts >= maxAttempts && active) {
          setStatus("Kunde inte verifiera signering i tid. Uppdatera sidan och försök igen.");
          setPendingFromCallback(false);
          setRestartSuggested(true);
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

  function clearBankIdQueryParam() {
    if (typeof window === "undefined") {
      return;
    }

    const url = new URL(window.location.href);

    if (url.searchParams.has("bankid")) {
      url.searchParams.delete("bankid");
      window.history.replaceState({}, "", url.toString());
    }
  }

  async function handleRestartSigning() {
    setStartSigningError("");
    setIsRestartingSigning(true);
    setRestartSuggested(false);
    setSigningTimedOut(false);
    clearBankIdQueryParam();
    setPendingFromCallback(false);

    try {
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

      setStatus("Signeringen återställd. Klicka på Signera med BankID för att fortsätta.");
    } catch {
      setStatus("Kunde inte återställa signeringen just nu. Försök igen.");
    } finally {
      setIsRestartingSigning(false);
    }
  }

  async function handleStartSigning() {
    setStartSigningError("");
    setRestartSuggested(false);
    setSigningTimedOut(false);

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

  async function downloadAttachment(attachment: AgreementAttachment) {
    setStartSigningError("");
    setDownloadingAttachmentId(attachment.id);

    try {
      const href = attachmentDownloadHref(token, attachment.id, "download");
      const response = await fetch(href);

      if (!response.ok) {
        throw new Error("Download failed");
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = attachment.filename;
      anchor.rel = "noopener";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      setStartSigningError("Kunde inte hämta bilagan. Försök igen.");
    } finally {
      setDownloadingAttachmentId(null);
    }
  }

  const sharedSigningControls =
    agreement && agreement.status !== "signed" ? (
      <div className="mt-4">
        <button
          type="button"
          onClick={handleStartSigning}
          disabled={isPollingActive || isRestartingSigning}
          className="inline-flex rounded-md bg-foreground px-4 py-2 text-background disabled:opacity-50"
        >
          {entryMode === "signup"
            ? "Identifiera dig med BankID"
            : showSignerGate
                ? "Fortsätt med BankID"
                : "Signera med BankID"}
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
            onClick={handleRestartSigning}
            disabled={isRestartingSigning}
            className="mt-2 inline-flex rounded-md border px-3 py-1 text-sm disabled:opacity-50"
          >
            {isRestartingSigning ? "Återställer..." : "Avbryt och starta om"}
          </button>
        ) : null}

        {!isPollingActive && restartSuggested && !signingTimedOut ? (
          <button
            type="button"
            onClick={handleRestartSigning}
            disabled={isRestartingSigning}
            className="mt-2 inline-flex rounded-md border px-3 py-1 text-sm disabled:opacity-50"
          >
            {isRestartingSigning ? "Återställer..." : "Starta om signering"}
          </button>
        ) : null}

        {startSigningError ? <p className="mt-2 text-sm">{startSigningError}</p> : null}
      </div>
    ) : null;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-6 py-12">
      <h1 className="text-2xl font-semibold">
        {isAgreementSigned ? "Avtalet är signerat" : entryMode === "signup" ? "Verifiera dig och signera" : "Signering"}
      </h1>

      {entryMode === "signup" && !showSignerGate ? (
        <p className="text-sm text-muted-foreground">
          {isAgreementSigned
            ? "Det här avtalet är redan signerat."
            : "Du har fått en unik länk. Klicka på knappen nedan för att identifiera dig med BankID."}
        </p>
      ) : null}

      {!agreement && status === "Laddar avtal..." ? (
        <div className="flex flex-col gap-4" aria-live="polite">
          <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
          <div className="h-4 w-full max-w-sm animate-pulse rounded bg-slate-100" />
          <div className="h-32 w-full animate-pulse rounded bg-slate-100" />
          <p className="text-sm text-slate-500">Laddar avtal...</p>
        </div>
      ) : null}

      {status && status !== "Laddar avtal..." ? <p className="text-sm">{status}</p> : null}

      {agreement ? (
        showSignerGate ? (
          <article className="rounded-md border p-4">
            <h2 className="text-xl font-semibold">{agreement.title}</h2>
            <div className="mt-3 space-y-2 text-sm text-slate-700">
              <p>
                Avtalstext, länkat innehåll och bilagor blir tillgängliga först när du har signerat. Signering sker i samma
                steg som när du godkänner i BankID-appen eller på din enhet.
              </p>
              {entryMode === "signup" ? (
                <p className="text-muted-foreground">
                  Du har fått en personlig länk. Nästa steg är att öppna BankID och slutföra signeringen.
                </p>
              ) : null}
              {(agreement.attachmentCount ?? 0) > 0 ? (
                <p className="text-muted-foreground">
                  Det här avtalet har {agreement.attachmentCount}{" "}
                  {agreement.attachmentCount === 1 ? "bilaga" : "bilagor"} blir synliga här när du är klar med signeringen.
                </p>
              ) : null}
            </div>
            <p className="mt-4 text-sm">
              Status:{" "}
              {agreement.status === "signed"
                ? "Signerad"
                : agreement.status === "signing"
                  ? "Signering pågår"
                  : "Ej signerad"}
            </p>
            {sharedSigningControls}
          </article>
        ) : (
          <article className="rounded-md border p-4">
            <h2 className="text-xl font-semibold">{agreement.title}</h2>
            <p className="mt-3 whitespace-pre-wrap">{agreement.content}</p>

            {agreement.links?.length ? (
              <section className="mt-4 rounded-md border p-3">
                <h3 className="text-sm font-medium">Bilagor / länkat innehåll</h3>
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

                {agreement.attachments.filter(isImageAttachment).length ? (
                  <div className="mt-3">
                    <p className="text-xs font-medium text-muted-foreground">Bildgalleri</p>
                    <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {agreement.attachments.filter(isImageAttachment).map((attachment) => (
                        <li key={`thumb-${attachment.id}`} className="rounded-md border p-1">
                          <button
                            type="button"
                            className="block w-full"
                            onClick={() => setPreviewAttachment(attachment)}
                          >
                            <Image
                              src={attachmentDownloadHref(token, attachment.id, "preview")}
                              alt={attachment.filename}
                              className="h-28 w-full rounded object-cover"
                              width={320}
                              height={180}
                              unoptimized
                            />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <ul className="mt-2 space-y-2 text-sm">
                  {agreement.attachments.map((attachment) => (
                    <li key={attachment.id} className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium">{attachment.filename}</p>
                        <p className="text-xs text-muted-foreground">
                          {attachment.contentType} - {formatAttachmentSize(attachment.size)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {(isImageAttachment(attachment) || isPdfAttachment(attachment)) ? (
                          <button
                            type="button"
                            className="rounded-md border px-3 py-1 text-xs"
                            onClick={() => setPreviewAttachment(attachment)}
                          >
                            Visa bilaga
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="rounded-md border px-3 py-1 text-xs disabled:opacity-50"
                          disabled={downloadingAttachmentId === attachment.id}
                          onClick={() => downloadAttachment(attachment)}
                        >
                          {downloadingAttachmentId === attachment.id ? "Hämtar…" : "Ladda ner"}
                        </button>
                      </div>
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
            {sharedSigningControls}
          </article>
        )
      ) : null}

      {previewAttachment ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Förhandsgranska ${previewAttachment.filename}`}
        >
          <div className="w-full max-w-5xl rounded-md bg-black p-3">
            <div className="mb-2 flex items-center justify-between text-white">
              <p className="text-sm font-medium">{previewAttachment.filename}</p>
              <button
                type="button"
                onClick={() => setPreviewAttachment(null)}
                className="rounded border border-white/40 px-3 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black"
                aria-label="Stäng förhandsgranskning"
              >
                Stäng
              </button>
            </div>
            {isImageAttachment(previewAttachment) ? (
              <Image
                src={attachmentDownloadHref(token, previewAttachment.id, "preview")}
                alt={previewAttachment.filename}
                className="max-h-[80vh] w-full rounded object-contain"
                width={1600}
                height={1200}
                unoptimized
              />
            ) : isPdfAttachment(previewAttachment) ? (
              <iframe
                src={attachmentDownloadHref(token, previewAttachment.id, "preview")}
                title={previewAttachment.filename}
                className="w-full min-h-[60vh] max-h-[80vh] rounded bg-white"
                frameBorder={0}
              />
            ) : null}
          </div>
        </div>
      ) : null}
    </main>
  );
}
