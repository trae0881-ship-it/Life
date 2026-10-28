"use client";

import { FormEvent, useState } from "react";

export default function ForgotPasswordForm() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const form = new FormData(event.currentTarget);
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.get("email") }),
      });
      const result = await response.json();
      if (response.status === 202) {
        setSent(true);
        setMessage(result.message);
      } else if (response.status === 503) {
        setMessage("Password recovery is temporarily unavailable. Please try again later.");
      } else if (response.status === 429) {
        setMessage("Too many attempts. Please wait before trying again.");
      } else {
        setMessage(result.error ?? "Unable to process this request.");
      }
    } catch {
      setMessage("Password recovery is temporarily unavailable. Please try again later.");
    } finally {
      setBusy(false);
    }
  }

  return <form className="recovery-form" onSubmit={submit}>
    <label>Email<input name="email" type="email" autoComplete="email" maxLength={254} required /></label>
    <button className="account-action" type="submit" disabled={busy}>{busy ? "Sending…" : "Send reset link"}</button>
    {message && <p className="account-message" role="status">{message}</p>}
    {sent && <p className="recovery-hint">If an account matches that address and the message does not arrive, contact the LIFE operator.</p>}
  </form>;
}
