"use client";

import { useMemo, useState } from "react";

type AgreementLinkItem = {
  title: string;
  url: string;
};

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
  const isCreated = Boolean(token);

  const shareLink = useMemo(() => {
    if (!token || typeof window === "undefined") {
      return "";
    }

    return `${window.location.origin}/sign/${token}`;
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
    setToken("");
    setStatus("");
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

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-6 py-12">
      <h1 className="text-2xl font-semibold">Skapa avtal</h1>

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
          <p className="text-sm font-medium">Lankat innehall (valfritt)</p>
          <p className="mt-1 text-xs text-muted-foreground">Lagg till titel + URL som visas pa signeringssidan.</p>

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
            + Lagg till lank
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
    </main>
  );
}
