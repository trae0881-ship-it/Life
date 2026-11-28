"use client";

import { FormEvent, useState } from "react";

type DeveloperStatus = "PENDING" | "VERIFIED" | "REJECTED" | "SUSPENDED";
type DeveloperProfile = {
  userId: string;
  status: DeveloperStatus;
  organizationName: string | null;
  website: string | null;
  supportEmail: string | null;
  description: string | null;
  applicationReason: string | null;
  rejectionReason: string | null;
  submittedAt: string;
  reviewedAt: string | null;
};

const statusText: Record<DeveloperStatus, string> = {
  PENDING: "Pending review",
  VERIFIED: "Verified",
  REJECTED: "Needs changes",
  SUSPENDED: "Suspended",
};

export default function DeveloperApplication({
  userId,
  role,
  profile: initialProfile,
}: {
  userId: string | null;
  role: string | null;
  profile: DeveloperProfile | null;
}) {
  const [profile, setProfile] = useState(initialProfile);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setMessage("");
    try {
      const method = profile && profile.status !== "REJECTED" ? "PATCH" : "POST";
      const response = await fetch("/api/developer/profile", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationName: String(form.get("organizationName") ?? ""),
          website: String(form.get("website") ?? ""),
          supportEmail: String(form.get("supportEmail") ?? ""),
          description: String(form.get("description") ?? ""),
          applicationReason: String(form.get("applicationReason") ?? ""),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save your Developer profile.");
      setProfile({
        ...result.profile,
        submittedAt: new Date(result.profile.submittedAt).toISOString(),
        reviewedAt: result.profile.reviewedAt ? new Date(result.profile.reviewedAt).toISOString() : null,
      });
      setMessage(method === "POST" ? "Your application is submitted for review." : "Your profile has been updated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save your Developer profile.");
    } finally {
      setBusy(false);
    }
  }

  if (!userId) {
    return <section className="developers-section">
      <h2>Developer access</h2>
      <p>Sign in or create a LIFE account to submit an application for Developer access.</p>
      <p><a className="developers-primary" href="/developer/signup">Apply for Developer access</a></p>
    </section>;
  }

  const isDeveloper = role === "DEVELOPER";
  const canEdit = profile?.status !== "SUSPENDED";
  const isResubmission = profile?.status === "REJECTED";
  return <section className="developers-section">
    <h2>Developer application</h2>
    {profile && <p className="developers-note" role="status">
      Status: <strong>{statusText[profile.status]}</strong>
      {profile.rejectionReason && <> — {profile.rejectionReason}</>}
    </p>}
    {isDeveloper && <p>Your Developer account is verified. Manage products, API keys, analytics, plans and invoices in the dashboard.</p>}
    {!isDeveloper && !profile && <p>Submit your organization and intended use for review. API products and keys remain unavailable until a Super Admin verifies your application.</p>}
    {profile?.status === "PENDING" && <p>Your application is under review. You can update your profile while it is pending.</p>}
    {profile?.status === "SUSPENDED" && <p>Developer API access is suspended. Contact LIFE support if you believe this is an error.</p>}
    {profile?.status === "REJECTED" && <p>Update your details and resubmit for review.</p>}
    {canEdit && <form className="developer-application-form" onSubmit={(event) => void saveProfile(event)}>
      <label>Organization name<input name="organizationName" defaultValue={profile?.organizationName ?? ""} maxLength={160} /></label>
      <label>Website (HTTPS)<input name="website" type="url" defaultValue={profile?.website ?? ""} maxLength={2048} /></label>
      <label>Support email<input name="supportEmail" type="email" defaultValue={profile?.supportEmail ?? ""} maxLength={254} /></label>
      <label>What are you building?<textarea name="description" defaultValue={profile?.description ?? ""} maxLength={2000} rows={3} /></label>
      <label>How will you use LIFE APIs?<textarea name="applicationReason" defaultValue={profile?.applicationReason ?? ""} required maxLength={1000} rows={3} /></label>
      <button className="developers-primary" disabled={busy || (isDeveloper && !profile)} type="submit">
        {busy ? "Saving…" : isDeveloper ? "Update profile" : isResubmission ? "Resubmit application" : profile ? "Update application" : "Submit application"}
      </button>
    </form>}
    {message && <p role="status">{message}</p>}
    {isDeveloper && <p><a href="/developers/dashboard">Open Developer dashboard</a></p>}
  </section>;
}
