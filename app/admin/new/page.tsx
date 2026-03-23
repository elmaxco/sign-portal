"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import AdminNav from "../admin-nav";
import AdminQuickLinks from "../admin-quick-links";
import {
  formatAttachmentSize,
  isAllowedAttachmentContentType,
  MAX_ATTACHMENTS_PER_AGREEMENT,
  MAX_ATTACHMENT_SIZE_BYTES,
} from "@/lib/attachments";

type AgreementLinkItem = {
  title: string;
  url: string;
};

type AgreementAttachmentItem = {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  storagePath: string;
  createdAt: string;
  uploadedBy: "admin";
};

type AttachmentFeedback = { variant: "success" | "error"; message: string };

function isImageAttachment(attachment: AgreementAttachmentItem) {
  return attachment.contentType === "image/png" || attachment.contentType === "image/jpeg";
}

function isPdfAttachment(attachment: AgreementAttachmentItem) {
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

export default function AdminNewAgreementPage() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [recipientSmsConsent, setRecipientSmsConsent] = useState(false);
  const [links, setLinks] = useState<AgreementLinkItem[]>([{ title: "", url: "" }]);
  const [token, setToken] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [attachments, setAttachments] = useState<AgreementAttachmentItem[]>([]);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [deletingAttachmentId, setDeletingAttachmentId] = useState<string | null>(null);
  const [attachmentFeedback, setAttachmentFeedback] = useState<AttachmentFeedback | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingPickKey, setPendingPickKey] = useState(0);
  const [previewAttachment, setPreviewAttachment] = useState<AgreementAttachmentItem | null>(null);
  const isCreated = Boolean(token);
  const uploadSectionRef = useRef<HTMLDivElement>(null);
  const pendingFileInputRef = useRef<HTMLInputElement>(null);
  const postCreateFileInputRef = useRef<HTMLInputElement>(null);

  const shareLink = useMemo(() => {
    if (!token || typeof window === "undefined") {
      return "";
    }

    return `${window.location.origin}/sign/${token}`;
  }, [token]);

  useEffect(() => {
    if (!token) {
      setAttachments([]);
      return;
    }

    let active = true;

    async function loadAttachments() {
      try {
        const response = await fetch(
          `/api/agreements/attachments/list?token=${encodeURIComponent(token)}`,
          {
            method: "GET",
            cache: "no-store",
          },
        );

        const payload = (await response.json()) as {
          ok?: boolean;
          attachments?: AgreementAttachmentItem[];
          error?: string;
        };

        if (!response.ok || !payload.ok) {
          throw new Error(payload.error ?? "Kunde inte läsa bilagor.");
        }

        if (!active) {
          return;
        }

        setAttachments(payload.attachments ?? []);
      } catch (error) {
        if (!active) {
          return;
        }

        const message = error instanceof Error ? error.message : "Unknown error";
        setAttachmentFeedback({ variant: "error", message: `Kunde inte läsa bilagor: ${message}` });
      }
    }

    loadAttachments();

    return () => {
      active = false;
    };
  }, [token]);

  useEffect(() => {
    if (!token) return;
    uploadSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [token]);

  async function uploadSingleAttachment(
    agreementToken: string,
    file: File,
  ): Promise<{ ok: true; attachment: AgreementAttachmentItem } | { ok: false; error: string }> {
    const formData = new FormData();
    formData.set("token", agreementToken);
    formData.set("file", file);
    const response = await fetch("/api/admin/agreements/attachments/upload", {
      method: "POST",
      body: formData,
    });
    const payload = (await response.json()) as {
      ok?: boolean;
      attachment?: AgreementAttachmentItem;
      error?: string;
    };
    if (!response.ok || !payload.ok || !payload.attachment) {
      return { ok: false, error: payload.error ?? "Kunde inte ladda upp." };
    }
    return { ok: true, attachment: payload.attachment };
  }

  async function refreshAttachmentsFromServer(agreementToken: string): Promise<boolean> {
    try {
      const response = await fetch(
        `/api/agreements/attachments/list?token=${encodeURIComponent(agreementToken)}`,
        {
          method: "GET",
          cache: "no-store",
        },
      );

      const payload = (await response.json()) as {
        ok?: boolean;
        attachments?: AgreementAttachmentItem[];
        error?: string;
      };

      if (!response.ok || !payload.ok) {
        setAttachmentFeedback((previous) =>
          previous
            ? previous
            : {
                variant: "error",
                message: `Kunde inte läsa bilagor: ${payload.error ?? "okänt fel"}`,
              },
        );
        return false;
      }

      setAttachments(payload.attachments ?? []);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setAttachmentFeedback((previous) =>
        previous ? previous : { variant: "error", message: `Kunde inte läsa bilagor: ${message}` },
      );
      return false;
    }
  }

  async function handleCreateAgreement(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isCreated) {
      return;
    }

    if (!title.trim() || !content.trim() || !recipientEmail.trim()) {
      setStatus("Titel, innehåll och mottagarens e-post måste fyllas i.");
      return;
    }

    setLoading(true);
    setStatus("");

    try {
      const response = await fetch("/api/admin/agreements/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          recipientEmail: recipientEmail.trim(),
          recipientPhone: recipientPhone.trim(),
          recipientSmsConsent,
          links: links
            .map((link) => ({ title: link.title.trim(), url: link.url.trim() }))
            .filter((link) => link.title && link.url),
        }),
      });

      const result = (await response.json()) as {
        token?: string;
        mailSent?: boolean;
        mailError?: string;
        error?: string;
      };

      if (!response.ok || !result.token) {
        setStatus(result.error ?? "Kunde inte skapa avtal.");
        return;
      }

      const newToken = result.token;
      setToken(newToken);
      if (pendingFiles.length === 0) {
        setAttachmentFeedback(null);
      }
      if (result.mailSent === false) {
        setStatus(`Avtalet skapades, men mejl kunde inte skickas: ${result.mailError || "okänt fel"}`);
      } else {
        setStatus("Avtalet skapades och mejl skickades.");
      }

      if (pendingFiles.length > 0) {
        setUploadingAttachment(true);
        setAttachmentFeedback(null);
        try {
          const queue = [...pendingFiles];
          let uploadFailed = false;
          for (const file of queue) {
            const uploadResult = await uploadSingleAttachment(newToken, file);
            if (!uploadResult.ok) {
              uploadFailed = true;
              const apiError = uploadResult.error;
              const msg = apiError.includes("Unsupported file type")
                ? "Ogiltig filtyp. Endast PDF, PNG och JPEG tillåts."
                : apiError.includes("File size") || apiError.includes("size")
                  ? "Filen är för stor. Max 10 MB per bilaga."
                  : apiError.includes("Max") && apiError.includes("attachments")
                    ? "Max 10 bilagor per avtal."
                    : apiError || "Kunde inte ladda upp bilaga.";
              setAttachmentFeedback({ variant: "error", message: msg });
              break;
            }
          }
          const listOk = await refreshAttachmentsFromServer(newToken);
          setPendingFiles([]);
          setPendingPickKey((key) => key + 1);
          if (!uploadFailed && listOk) {
            setAttachmentFeedback({
              variant: "success",
              message:
                queue.length === 1
                  ? "Bilagan laddades upp."
                  : `Alla ${queue.length} bilagor laddades upp.`,
            });
          }
        } finally {
          setUploadingAttachment(false);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setStatus(`Kunde inte skapa avtal: ${message}`);
    } finally {
      setLoading(false);
    }
  }

  function handleCreateAnother() {
    setTitle("");
    setContent("");
    setRecipientEmail("");
    setRecipientPhone("");
    setRecipientSmsConsent(false);
    setLinks([{ title: "", url: "" }]);
    setAttachments([]);
    setAttachmentFile(null);
    setPendingFiles([]);
    setPendingPickKey((key) => key + 1);
    setAttachmentFeedback(null);
    setToken("");
    setStatus("");
  }

  async function handleUploadAttachment() {
    if (!token || !attachmentFile) {
      setAttachmentFeedback({
        variant: "error",
        message: "Skapa avtalet först och välj en fil.",
      });
      return;
    }

    if (!isAllowedAttachmentContentType(attachmentFile.type || "")) {
      setAttachmentFeedback({
        variant: "error",
        message: "Ogiltig filtyp. Endast PDF, PNG och JPEG tillåts.",
      });
      return;
    }

    if (attachmentFile.size <= 0 || attachmentFile.size > MAX_ATTACHMENT_SIZE_BYTES) {
      setAttachmentFeedback({
        variant: "error",
        message: `Filen får högst vara ${formatAttachmentSize(MAX_ATTACHMENT_SIZE_BYTES)}.`,
      });
      return;
    }

    if (attachments.length >= MAX_ATTACHMENTS_PER_AGREEMENT) {
      setAttachmentFeedback({
        variant: "error",
        message: `Max ${MAX_ATTACHMENTS_PER_AGREEMENT} bilagor per avtal.`,
      });
      return;
    }

    setUploadingAttachment(true);
    setAttachmentFeedback(null);

    try {
      const result = await uploadSingleAttachment(token, attachmentFile);

      if (!result.ok) {
        const apiError = result.error;
        const msg = apiError.includes("Unsupported file type")
          ? "Ogiltig filtyp. Endast PDF, PNG och JPEG tillåts."
          : apiError.includes("File size") || apiError.includes("size")
            ? "Filen är för stor. Max 10 MB per bilaga."
            : apiError.includes("Max") && apiError.includes("attachments")
              ? "Max 10 bilagor per avtal."
              : apiError || "Kunde inte ladda upp bilaga.";
        setAttachmentFeedback({ variant: "error", message: msg });
        return;
      }

      setAttachmentFile(null);
      setFileInputKey((k) => k + 1);
      setAttachments((previous) => [...previous, result.attachment]);
      setAttachmentFeedback({ variant: "success", message: "Bilagan laddades upp." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setAttachmentFeedback({
        variant: "error",
        message: `Kunde inte ladda upp bilaga: ${message}`,
      });
    } finally {
      setUploadingAttachment(false);
    }
  }

  async function handleDeleteAttachment(attachmentId: string) {
    if (!token) {
      return;
    }

    if (!window.confirm("Är du säker på att du vill ta bort bilagan?")) {
      return;
    }

    setDeletingAttachmentId(attachmentId);
    setAttachmentFeedback(null);

    try {
      const response = await fetch("/api/admin/agreements/attachments/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, attachmentId }),
      });

      const payload = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || !payload.ok) {
        setAttachmentFeedback({
          variant: "error",
          message: payload.error ?? "Kunde inte ta bort bilagan.",
        });
        return;
      }

      setAttachments((previous) => previous.filter((item) => item.id !== attachmentId));
      setAttachmentFeedback({ variant: "success", message: "Bilagan togs bort." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setAttachmentFeedback({
        variant: "error",
        message: `Kunde inte ta bort bilagan: ${message}`,
      });
    } finally {
      setDeletingAttachmentId(null);
    }
  }

  function updateLink(index: number, patch: Partial<AgreementLinkItem>) {
    setLinks((previous) => previous.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }

  function addLinkRow() {
    setLinks((previous) => [...previous, { title: "", url: "" }]);
  }

  function removeLinkRow(index: number) {
    setLinks((previous) => {
      const next = previous.filter((_, i) => i !== index);
      return next.length ? next : [{ title: "", url: "" }];
    });
  }

  function addPendingFilesFromInput(fileList: FileList | null) {
    if (!fileList?.length) {
      return;
    }

    const next: File[] = [];
    let message = "";

    for (const file of Array.from(fileList)) {
      const room = MAX_ATTACHMENTS_PER_AGREEMENT - pendingFiles.length - next.length;
      if (room <= 0) {
        message = `Max ${MAX_ATTACHMENTS_PER_AGREEMENT} bilagor per avtal.`;
        break;
      }

      if (!isAllowedAttachmentContentType(file.type || "")) {
        message = "Ogiltig filtyp. Endast PDF, PNG och JPEG tillåts.";
        continue;
      }

      if (file.size <= 0 || file.size > MAX_ATTACHMENT_SIZE_BYTES) {
        message = `Varje fil får högst vara ${formatAttachmentSize(MAX_ATTACHMENT_SIZE_BYTES)}.`;
        continue;
      }

      next.push(file);
    }

    if (next.length) {
      setPendingFiles((previous) => [...previous, ...next]);
    }

    if (message) {
      setAttachmentFeedback({ variant: "error", message });
    }
  }

  function removePendingFileAt(index: number) {
    setPendingFiles((previous) => previous.filter((_, i) => i !== index));
  }

  // Sort attachments: newest first, then by type
  const sortedAttachments = [...attachments].sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    if (dateA !== dateB) return dateB - dateA;
    if (a.contentType < b.contentType) return -1;
    if (a.contentType > b.contentType) return 1;
    return 0;
  });

  // Group for display: images, PDFs, others
  const imageAttachments = sortedAttachments.filter(isImageAttachment);
  const pdfAttachments = sortedAttachments.filter(isPdfAttachment);
  const otherAttachments = sortedAttachments.filter(
    (a) => !isImageAttachment(a) && !isPdfAttachment(a),
  );

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-6 py-12">
      <AdminNav title="Admin - Skapa avtal" />

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        <p className="font-semibold text-slate-900">Så laddar du upp avtal (PDF)</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>Fyll i titel, kort text i fältet &quot;Innehåll&quot; (t.ex. sammanfattning eller &quot;Se bifogade avtalsdokument&quot;) och mottagarens e-post.</li>
          <li>
            <strong>Valfritt:</strong> Lägg till PDF eller bilder i rutan <strong>Bilagor innan du skapar</strong> om du
            vill att de laddas upp automatiskt när avtalet skapas.
          </li>
          <li>
            Klicka <strong>Skapa</strong> (texten blir <strong>Skapa och ladda upp …</strong> om du har valt filer i
            förväg).
          </li>
          <li>
            Behöver du fler dokument laddar du upp dem under <strong>Ladda upp avtal och bilagor</strong> efter
            skapande – max {MAX_ATTACHMENTS_PER_AGREEMENT} filer totalt, {formatAttachmentSize(MAX_ATTACHMENT_SIZE_BYTES)}{" "}
            per fil.
          </li>
        </ol>
      </div>

      <form onSubmit={handleCreateAgreement} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Titel</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            disabled={loading || isCreated}
            className="rounded-md border px-3 py-2"
            placeholder="Avtalstitel"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Innehåll</span>
          <span className="text-xs text-muted-foreground">
            Kort text som visas på signeringssidan. Om hela avtalet finns som PDF kan du skriva t.ex. &quot;Det fullständiga avtalet finns som bifogad PDF nedan.&quot;
          </span>
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            disabled={loading || isCreated}
            className="min-h-40 rounded-md border px-3 py-2"
            placeholder="T.ex. sammanfattning eller hänvisning till bifogade PDF-avtal…"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Mottagarens e-post</span>
          <input
            type="email"
            value={recipientEmail}
            onChange={(event) => setRecipientEmail(event.target.value)}
            disabled={loading || isCreated}
            className="rounded-md border px-3 py-2"
            placeholder="namn@domän.se"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Mottagarens telefon (valfritt, E.164)</span>
          <input
            value={recipientPhone}
            onChange={(event) => setRecipientPhone(event.target.value)}
            disabled={loading || isCreated}
            className="rounded-md border px-3 py-2"
            placeholder="+46701234567"
          />
        </label>

        <label className="flex items-start gap-2 rounded-md border p-3 text-sm">
          <input
            type="checkbox"
            checked={recipientSmsConsent}
            onChange={(event) => setRecipientSmsConsent(event.target.checked)}
            disabled={loading || isCreated}
            className="mt-0.5"
          />
          <span>Jag har samtycke att kontakta mottagaren via SMS.</span>
        </label>

        <div className="rounded-md border p-4">
          <p className="text-sm font-medium">Länkat innehåll (valfritt)</p>
          <p className="mt-1 text-xs text-muted-foreground">Lägg till titel + URL som visas på signeringssidan.</p>

          <div className="mt-3 space-y-3">
            {links.map((link, index) => (
              <div key={`link-${index}`} className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                <input
                  value={link.title}
                  onChange={(event) => updateLink(index, { title: event.target.value })}
                  disabled={loading || isCreated}
                  className="rounded-md border px-3 py-2"
                  placeholder="Titel (t.ex. Prislista)"
                />
                <input
                  value={link.url}
                  onChange={(event) => updateLink(index, { url: event.target.value })}
                  disabled={loading || isCreated}
                  className="rounded-md border px-3 py-2"
                  placeholder="https://..."
                />
                <button
                  type="button"
                  onClick={() => removeLinkRow(index)}
                  disabled={loading || isCreated}
                  className="rounded-md border px-3 py-2 text-sm"
                >
                  Ta bort
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addLinkRow}
            disabled={loading || isCreated}
            className="mt-3 rounded-md border px-3 py-2 text-sm"
          >
            + Lägg till länk
          </button>
        </div>

        {!isCreated ? (
          <div className="rounded-md border border-dashed border-slate-300 bg-slate-50/80 p-4">
            <p className="text-sm font-medium text-slate-900">Bilagor innan du skapar (valfritt)</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Välj PDF eller bilder som laddas upp automatiskt när du klickar Skapa. Du kan även lägga till fler filer
              i avsnittet nedan efter att avtalet skapats.
            </p>
            <input
              ref={pendingFileInputRef}
              key={pendingPickKey}
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
              onChange={(event) => {
                addPendingFilesFromInput(event.target.files);
                event.target.value = "";
              }}
              disabled={
                loading ||
                uploadingAttachment ||
                pendingFiles.length >= MAX_ATTACHMENTS_PER_AGREEMENT
              }
              className="hidden"
              aria-hidden
              tabIndex={-1}
              aria-label="Välj bilagor att ladda upp när avtalet skapas"
            />
            <button
              type="button"
              onClick={() => pendingFileInputRef.current?.click()}
              disabled={
                loading ||
                uploadingAttachment ||
                pendingFiles.length >= MAX_ATTACHMENTS_PER_AGREEMENT
              }
              className="mt-3 w-fit rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
            >
              Välj PDF eller bilder
            </button>
            {pendingFiles.length ? (
              <ul className="mt-3 space-y-2 text-sm" aria-label="Köade bilagor">
                {pendingFiles.map((file, index) => (
                  <li
                    key={`${file.name}-${file.size}-${index}`}
                    className="flex flex-wrap items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2"
                  >
                    <span className="font-medium text-slate-900">{file.name}</span>
                    <span className="text-xs text-muted-foreground">{formatAttachmentSize(file.size)}</span>
                    <button
                      type="button"
                      className="ml-auto rounded border px-2 py-1 text-xs"
                      disabled={loading || uploadingAttachment}
                      onClick={() => removePendingFileAt(index)}
                    >
                      Ta bort
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {attachmentFeedback && !isCreated ? (
              <p
                role="status"
                className={`mt-3 text-sm font-medium ${
                  attachmentFeedback.variant === "error" ? "text-red-600" : "text-green-700"
                }`}
              >
                {attachmentFeedback.message}
              </p>
            ) : null}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={loading || uploadingAttachment || isCreated}
          className="w-fit rounded-md bg-foreground px-4 py-2 text-background disabled:opacity-50"
        >
          {loading
            ? pendingFiles.length > 0
              ? "Skapar och laddar upp…"
              : "Skapar…"
            : pendingFiles.length > 0
              ? `Skapa och ladda upp ${pendingFiles.length} fil${pendingFiles.length === 1 ? "" : "er"}`
              : "Skapa"}
        </button>

        {isCreated ? (
          <button
            type="button"
            onClick={handleCreateAnother}
            className="w-fit rounded-md border px-4 py-2"
          >
            Skapa nytt avtal
          </button>
        ) : null}
      </form>

      {status ? <p className="text-sm">{status}</p> : null}

      {shareLink ? (
        <div className="rounded-md border p-4">
          <p className="text-sm font-medium">Delningslänk</p>
          <a href={shareLink} className="break-all text-sm underline">
            {shareLink}
          </a>
        </div>
      ) : null}

      {isCreated ? (
        <div
          ref={uploadSectionRef}
          id="ladda-upp-avtal"
          className="rounded-md border-2 border-[var(--brand)]/25 bg-[var(--surface-soft)] p-4"
        >
          <p className="text-base font-semibold text-slate-900">Ladda upp avtal och bilagor</p>
          <p className="mt-1 text-sm text-slate-600">
            Här kan du lägga till fler avtalsdokument (PDF) och bilder om du behöver – t.ex. om du inte laddade upp allt
            innan du skapade avtalet. Mottagaren ser dem på signeringssidan och kan förhandsgranska innan BankID.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">Sortering: nyast först, grupperat efter typ (bilder, PDF, övrigt).</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <input
              ref={postCreateFileInputRef}
              key={fileInputKey}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
              onChange={(e) => setAttachmentFile(e.target.files?.[0] ?? null)}
              disabled={uploadingAttachment || attachments.length >= MAX_ATTACHMENTS_PER_AGREEMENT}
              className="hidden"
              aria-hidden
              tabIndex={-1}
              aria-label="Välj en bilaga att ladda upp"
            />
            <button
              type="button"
              onClick={() => postCreateFileInputRef.current?.click()}
              disabled={uploadingAttachment || attachments.length >= MAX_ATTACHMENTS_PER_AGREEMENT}
              className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
            >
              Välj PDF eller bild
            </button>
            {attachmentFile ? (
              <span className="max-w-[min(100%,20rem)] truncate text-sm text-slate-700" title={attachmentFile.name}>
                Vald: <span className="font-medium">{attachmentFile.name}</span>
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">Ingen fil vald ännu.</span>
            )}
            <button
              type="button"
              onClick={handleUploadAttachment}
              disabled={uploadingAttachment || !attachmentFile || attachments.length >= MAX_ATTACHMENTS_PER_AGREEMENT}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {uploadingAttachment ? "Laddar upp…" : "Ladda upp"}
            </button>
          </div>
          <div className="mt-3 space-y-3">
            {sortedAttachments.map((attachment) => (
              <div key={attachment.id} className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-medium">{attachment.filename}</span>
                <span className="text-xs text-muted-foreground">{attachment.contentType}</span>
                {(isImageAttachment(attachment) || isPdfAttachment(attachment)) ? (
                  <button
                    type="button"
                    className="rounded border px-2 py-1 text-xs"
                    onClick={() => setPreviewAttachment(attachment)}
                  >
                    Förhandsvisa
                  </button>
                ) : null}
                <button
                  type="button"
                  className="rounded border px-2 py-1 text-xs"
                  disabled={deletingAttachmentId === attachment.id}
                  onClick={() => handleDeleteAttachment(attachment.id)}
                >
                  {deletingAttachmentId === attachment.id ? "Tar bort..." : "Ta bort"}
                </button>
              </div>
            ))}
          </div>
          {attachmentFeedback && isCreated ? (
            <p
              role="status"
              className={`mt-3 text-sm font-medium ${
                attachmentFeedback.variant === "error" ? "text-red-600" : "text-green-700"
              }`}
            >
              {attachmentFeedback.message}
            </p>
          ) : null}
        </div>
      ) : null}

      {previewAttachment && token ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-5xl rounded-md bg-black p-3">
            <div className="mb-2 flex items-center justify-between text-white">
              <p className="text-sm font-medium">{previewAttachment.filename}</p>
              <button
                type="button"
                onClick={() => setPreviewAttachment(null)}
                className="rounded border border-white/40 px-3 py-1 text-xs"
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

      <AdminQuickLinks />
    </main>
  );
}
