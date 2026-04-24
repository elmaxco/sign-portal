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

function attachmentPreviewSrc(token: string, attachmentId: string) {
  // Hide PDF viewer chrome and fit the page better in the inline frame.
  return `${attachmentDownloadHref(token, attachmentId, "preview")}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`;
}

function attachmentPdfPageSrc(token: string, attachmentId: string, page: number) {
  const safePage = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1;
  const query = new URLSearchParams({
    token,
    attachmentId,
    intent: "preview",
    page: String(safePage),
  });

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
  const [downloadingAttachmentId, setDownloadingAttachmentId] = useState<string | null>(null);
  const [pdfPageByAttachmentId, setPdfPageByAttachmentId] = useState<Record<string, number>>({});
  const isAgreementSigned = agreement?.status === "signed";
  const agreementStatusLabel =
    agreement?.status === "signed"
      ? "Signerad"
      : agreement?.status === "signing"
        ? "Signering pågår"
        : "Ej signerad";
  const agreementStatusBadgeClass =
    agreement?.status === "signed"
      ? "bg-emerald-100 text-emerald-800 ring-emerald-200"
      : agreement?.status === "signing"
        ? "bg-amber-100 text-amber-800 ring-amber-200"
        : "bg-rose-100 text-rose-800 ring-rose-200";

  useEffect(() => {
    let active = true;

    async function loadAgreement() {
      try {
        const params = new URLSearchParams({ token, signerView: "full" });

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

  function setPdfPage(attachmentId: string, page: number) {
    const safePage = Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1;
    setPdfPageByAttachmentId((previous) => ({
      ...previous,
      [attachmentId]: safePage,
    }));
  }

  const sharedSigningControls =
    agreement && agreement.status !== "signed" ? (
      <div className="mt-8 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
        <button
          type="button"
          onClick={handleStartSigning}
          disabled={isPollingActive || isRestartingSigning}
          className="inline-flex items-center rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {entryMode === "signup"
            ? "Identifiera dig och signera med BankID"
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
            className="mt-3 inline-flex rounded-full border border-slate-300 px-4 py-1.5 text-sm text-slate-700 transition hover:bg-white disabled:opacity-50"
          >
            {isRestartingSigning ? "Återställer..." : "Avbryt och starta om"}
          </button>
        ) : null}

        {!isPollingActive && restartSuggested && !signingTimedOut ? (
          <button
            type="button"
            onClick={handleRestartSigning}
            disabled={isRestartingSigning}
            className="mt-3 inline-flex rounded-full border border-slate-300 px-4 py-1.5 text-sm text-slate-700 transition hover:bg-white disabled:opacity-50"
          >
            {isRestartingSigning ? "Återställer..." : "Starta om signering"}
          </button>
        ) : null}

        {startSigningError ? <p className="mt-3 text-sm text-red-700">{startSigningError}</p> : null}
      </div>
    ) : null;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-4 py-10 sm:px-6 sm:py-12">
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
        {isAgreementSigned ? "Avtalet är signerat" : entryMode === "signup" ? "Verifiera dig och signera" : "Signering"}
      </h1>

      {entryMode === "signup" ? (
        <p className="text-sm text-muted-foreground">
          {isAgreementSigned
            ? "Det här avtalet är redan signerat."
            : "Du har fått en unik länk. Läs avtalet nedan och signera när du är redo."}
        </p>
      ) : null}

      {!agreement && status === "Laddar avtal..." ? (
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200" aria-live="polite">
          <div className="h-8 w-48 animate-pulse rounded bg-slate-200" />
          <div className="mt-4 h-4 w-full animate-pulse rounded bg-slate-100" />
          <div className="mt-2 h-4 w-full max-w-sm animate-pulse rounded bg-slate-100" />
          <div className="mt-5 h-32 w-full animate-pulse rounded bg-slate-100" />
          <p className="mt-4 text-sm text-slate-500">Laddar avtal...</p>
        </div>
      ) : null}

      {status && status !== "Laddar avtal..." ? (
        <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">{status}</p>
      ) : null}

      {agreement ? (
        <article className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">{agreement.title}</h2>
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ring-1 ${agreementStatusBadgeClass}`}>
                {agreementStatusLabel}
              </span>
            </div>

            <p className="mt-5 whitespace-pre-wrap text-[15px] leading-7 text-slate-700">{agreement.content}</p>

            {agreement.links?.length ? (
              <section className="mt-8 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <h3 className="text-sm font-semibold tracking-wide text-slate-700">Bilagor / länkat innehåll</h3>
                <ul className="mt-3 space-y-2 text-sm">
                  {agreement.links.map((link, index) => (
                    <li key={`${link.url}-${index}`}>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-slate-800 underline decoration-slate-300 underline-offset-2 hover:decoration-slate-700"
                      >
                        {link.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {agreement.attachments?.length ? (
              <section className="mt-8 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <h3 className="text-sm font-semibold tracking-wide text-slate-700">Bilagor</h3>
                <ul className="mt-2 space-y-4 text-sm">
                  {agreement.attachments.map((attachment) => (
                    <li key={attachment.id} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium text-slate-900">{attachment.filename}</p>
                        <p className="text-xs text-muted-foreground">
                          {attachment.contentType} - {formatAttachmentSize(attachment.size)}
                        </p>
                      </div>

                      {isImageAttachment(attachment) ? (
                        <div className="mt-3 overflow-hidden rounded-lg bg-slate-100 p-2">
                          <Image
                            src={attachmentPreviewSrc(token, attachment.id)}
                            alt={attachment.filename}
                            className="max-h-128 w-full rounded object-contain"
                            width={1600}
                            height={1200}
                            unoptimized
                          />
                        </div>
                      ) : null}

                      {isPdfAttachment(attachment) ? (
                        <div className="mt-3 overflow-hidden rounded-lg bg-slate-100 p-1">
                          <div className="mb-2 flex items-center justify-between gap-2 px-1">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:opacity-50"
                                onClick={() => setPdfPage(attachment.id, (pdfPageByAttachmentId[attachment.id] ?? 1) - 1)}
                                disabled={(pdfPageByAttachmentId[attachment.id] ?? 1) <= 1}
                              >
                                Föregående
                              </button>
                              <button
                                type="button"
                                className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                                onClick={() => setPdfPage(attachment.id, (pdfPageByAttachmentId[attachment.id] ?? 1) + 1)}
                              >
                                Nästa
                              </button>
                            </div>
                            <p className="text-xs font-medium text-slate-600">
                              Sida {pdfPageByAttachmentId[attachment.id] ?? 1}
                            </p>
                          </div>
                          <iframe
                            key={`${attachment.id}-${pdfPageByAttachmentId[attachment.id] ?? 1}`}
                            src={attachmentPdfPageSrc(token, attachment.id, pdfPageByAttachmentId[attachment.id] ?? 1)}
                            title={attachment.filename}
                            className="pointer-events-none h-[85vh] rounded bg-white"
                            style={{ width: "calc(100% + 18px)", marginRight: "-18px" }}
                            frameBorder={0}
                          />
                        </div>
                      ) : null}

                      <div className="mt-3 flex items-center gap-2">
                        <button
                          type="button"
                          className="rounded-full border border-slate-300 bg-white px-4 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:opacity-50"
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

            {sharedSigningControls}
          </article>
      ) : null}

    </main>
  );
}
