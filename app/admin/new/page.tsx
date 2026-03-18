"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import AdminNav from "../admin-nav";
import AdminQuickLinks from "../admin-quick-links";

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

function isImageAttachment(attachment: AgreementAttachmentItem) {
  return attachment.contentType === "image/png" || attachment.contentType === "image/jpeg";
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
  const [attachmentStatus, setAttachmentStatus] = useState("");
  const isCreated = Boolean(token);

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
        setAttachmentStatus(`Kunde inte läsa bilagor: ${message}`);
      }
    }

    loadAttachments();

    return () => {
      active = false;
    };
  }, [token]);

  async function handleCreateAgreement(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isCreated) {
      return;
    }

    if (!title.trim() || !content.trim() || !recipientEmail.trim()) {
      setStatus("Title, content och mottagarens e-post måste fyllas i.");
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

      setToken(result.token);
      if (result.mailSent === false) {
        setStatus(`Avtalet skapades, men mejl kunde inte skickas: ${result.mailError || "okänt fel"}`);
      } else {
        setStatus("Avtalet skapades och mejl skickades.");
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
    setAttachmentStatus("");
    setToken("");
    setStatus("");
  }

  async function handleUploadAttachment() {
    if (!token || !attachmentFile) {
      setAttachmentStatus("Skapa avtalet först och välj en fil.");
      return;
    }

    setUploadingAttachment(true);
    setAttachmentStatus("");

    try {
      const formData = new FormData();
      formData.set("token", token);
      formData.set("file", attachmentFile);

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
        setAttachmentStatus(payload.error ?? "Kunde inte ladda upp bilaga.");
        return;
      }

      setAttachmentFile(null);
      setAttachments((previous) => [...previous, payload.attachment as AgreementAttachmentItem]);
      setAttachmentStatus("Bilaga uppladdad.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setAttachmentStatus(`Kunde inte ladda upp bilaga: ${message}`);
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
    setAttachmentStatus("");

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
        setAttachmentStatus(payload.error ?? "Kunde inte ta bort bilagan.");
        return;
      }

      setAttachments((previous) => previous.filter((item) => item.id !== attachmentId));
      setAttachmentStatus("Bilaga borttagen.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setAttachmentStatus(`Kunde inte ta bort bilagan: ${message}`);
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

  // Sort attachments: newest first, then by type
  const sortedAttachments = [...attachments].sort((a, b) => {
    // Newest first
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    if (dateA !== dateB) return dateB - dateA;
    // By type
    if (a.contentType < b.contentType) return -1;
    if (a.contentType > b.contentType) return 1;
    return 0;
  });

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-6 py-12">
      <AdminNav title="Admin - Skapa avtal" />

      <form onSubmit={handleCreateAgreement} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Title</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            disabled={loading || isCreated}
            className="rounded-md border px-3 py-2"
            placeholder="Avtalstitel"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Content</span>
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            disabled={loading || isCreated}
            className="min-h-40 rounded-md border px-3 py-2"
            placeholder="Avtalstext"
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

        <button
          type="submit"
          disabled={loading || isCreated}
          className="w-fit rounded-md bg-foreground px-4 py-2 text-background disabled:opacity-50"
        >
          Create
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
        <div className="rounded-md border p-4">
          <p className="text-sm font-medium">Bilagor (sorterat: nyast först, typ)</p>
          <div className="mt-3 space-y-3">
            {sortedAttachments.map((attachment) => (
              <div key={attachment.id} className="flex items-center gap-3">
                <span className="text-xs font-medium">{attachment.filename}</span>
                <span className="text-xs text-muted-foreground">{attachment.contentType}</span>
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
          {attachmentStatus && <p className="mt-2 text-xs text-red-600">{attachmentStatus}</p>}
        </div>
          {/* Removed duplicate attachmentStatus rendering to fix build error */}

          <ul className="mt-3 space-y-2 text-sm">
            {attachments.map((attachment) => (
              <li
                key={attachment.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2"
              >
                <div className="flex items-center gap-3">
                  {isImageAttachment(attachment) ? (
                    <a
                      href={attachmentDownloadHref(token, attachment.id, "preview")}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Image
                        src={attachmentDownloadHref(token, attachment.id, "preview")}
                        alt={attachment.filename}
                        width={64}
                        height={64}
                        className="h-16 w-16 rounded object-cover"
                        unoptimized
                      />
                    </a>
                  ) : null}
                  <p className="font-medium">{attachment.filename}</p>
                  <p className="text-xs text-muted-foreground">
                    {attachment.contentType} - {Math.ceil(attachment.size / 1024)} KB
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteAttachment(attachment.id)}
                  disabled={deletingAttachmentId === attachment.id}
                  className="rounded-md border px-3 py-1 text-xs"
                >
                  {deletingAttachmentId === attachment.id ? "Tar bort..." : "Ta bort"}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <AdminQuickLinks />
    </main>
  );
}
