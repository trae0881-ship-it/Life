"use client";

import { useState, type FormEvent } from "react";

export default function SuperAdminLoginForm() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
          portal: "super-admin",
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.code === "SUPER_ADMIN_REQUIRED"
          ? "This account is not authorized for the Super Admin portal."
          : result.code === "RATE_LIMITED"
            ? "Too many sign-in attempts. Wait before trying again."
            : result.code === "AUTH_UNAVAILABLE"
              ? "The account service is temporarily unavailable."
              : "The email or password could not be verified.");
        return;
      }
      if (result.user?.role !== "SUPER_ADMIN") {
        await fetch("/api/auth/logout", { method: "POST" });
        setMessage("This account is not authorized for the Super Admin portal.");
        return;
      }
      window.location.assign("/super-admin");
    } catch {
      setMessage("The account service is temporarily unavailable.");
    } finally {
      setBusy(false);
    }
  }

  return <form className="account-auth-form" onSubmit={(event) => void submit(event)}>
    <label>Email
      <input autoComplete="username" name="email" required type="email" />
    </label>
    <label>Password
      <input autoComplete="current-password" name="password" required type="password" />
    </label>
    <button className="account-action" disabled={busy} type="submit">
      {busy ? "Verifying…" : "Sign in to Super Admin"}
    </button>
    {message && <p className="account-message" role="alert">{message}</p>}
  </form>;
}
