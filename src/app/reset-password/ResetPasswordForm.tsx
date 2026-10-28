"use client";

import { FormEvent, useEffect, useState } from "react";

export default function ResetPasswordForm() {
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [complete, setComplete] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const resetToken = params.get("token") ?? "";
    window.history.replaceState(null, "", window.location.pathname);
    setToken(resetToken);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      setMessage("This reset link is invalid or expired. Request a new one.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const formElement = event.currentTarget;
      const form = new FormData(formElement);
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          password: form.get("password"),
          confirmPassword: form.get("confirmPassword"),
        }),
      });
      const result = await response.json();
      if (response.ok) {
        setComplete(true);
        setToken("");
        setMessage(result.message);
        formElement.reset();
      } else {
        setMessage(result.error ?? "Unable to reset the password.");
      }
    } catch {
      setMessage("Password recovery is temporarily unavailable. Please try again later.");
    } finally {
      setBusy(false);
    }
  }

  return <>
    {token && !complete ? <form className="recovery-form" onSubmit={submit}>
      <label>New password<input name="password" type={showPasswords ? "text" : "password"} autoComplete="new-password" minLength={12} maxLength={128} required /></label>
      <small>Use 12–128 characters without leading or trailing spaces.</small>
      <label>Confirm new password<input name="confirmPassword" type={showPasswords ? "text" : "password"} autoComplete="new-password" minLength={12} maxLength={128} required /></label>
      <button className="account-password-toggle" type="button" aria-pressed={showPasswords} onClick={() => setShowPasswords((visible) => !visible)}>{showPasswords ? "Hide passwords" : "Show passwords"}</button>
      <button className="account-action" type="submit" disabled={busy}>{busy ? "Updating…" : "Update password"}</button>
    </form> : !complete && <p role="status">This reset link is invalid or expired. Request a new one.</p>}
    {message && <p className="account-message" role="status">{message}</p>}
    <a className="login-home-link" href={complete ? "/login" : "/forgot-password"}>{complete ? "Return to sign in" : "Request a new reset link"}</a>
  </>;
}
