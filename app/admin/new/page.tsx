"use client";

import { useMemo, useState } from "react";
import { createAgreement } from "@/lib/agreements";

export default function AdminNewAgreementPage() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [token, setToken] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const shareLink = useMemo(() => {
    if (!token || typeof window === "undefined") {
      return "";
    }

    return `${window.location.origin}/sign/${token}`;
  }, [token]);

  async function handleCreateAgreement(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim() || !content.trim()) {
      setStatus("Title och content måste fyllas i.");
      return;
    }

    setLoading(true);
    setStatus("");

    try {
      const result = await createAgreement({
        title: title.trim(),
        content: content.trim(),
      });

      setToken(result.token);
      setStatus("Avtalet skapades.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setStatus(`Kunde inte skapa avtal: ${message}`);
    } finally {
      setLoading(false);
    }
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
            className="rounded-md border px-3 py-2"
            placeholder="Avtalstitel"
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">Content</span>
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            className="min-h-40 rounded-md border px-3 py-2"
            placeholder="Avtalstext"
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-fit rounded-md bg-foreground px-4 py-2 text-background disabled:opacity-50"
        >
          Create
        </button>
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
