"use client";

import { useMemo, useState } from "react";

export default function AdminNewAgreementPage() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
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
        }),
      });

      const result = (await response.json()) as { token?: string; error?: string };

      if (!response.ok || !result.token) {
        setStatus(result.error ?? "Kunde inte skapa avtal.");
        return;
      }

      setToken(result.token);
      setStatus("Avtalet skapades.");
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
    setToken("");
    setStatus("");
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
