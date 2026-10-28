"use client";

import AccountPanel from "../AccountPanel";

export default function LoginExperience({ returnTo, initialMode = "login", portal = "standard" }: { returnTo: string; initialMode?: "login" | "register"; portal?: "standard" | "developer" }) {
  const isRegistration = initialMode === "register";
  const isDeveloperPortal = portal === "developer";
  return <main className="login-page">
    <header className="login-header">
      <a className="login-brand" href="/">✳ LIFE</a>
      <nav className="login-account-nav" aria-label="Account navigation">
        {isRegistration
          ? <a href={isDeveloperPortal ? "/developer/login?next=%2Fdevelopers%2Fdashboard" : `/login?next=${encodeURIComponent(returnTo)}`}>{isDeveloperPortal ? "Developer Login" : "Login / Sign In"}</a>
          : <a href={isDeveloperPortal ? `/developer/signup?next=${encodeURIComponent(returnTo)}` : `/signup?next=${encodeURIComponent(returnTo)}`}>{isDeveloperPortal ? "Create Developer Account" : "Create Account / Sign Up"}</a>}
      </nav>
    </header>
    <section className="login-card" aria-labelledby="login-title">
      <p className="home-eyebrow">{isDeveloperPortal ? "LIFE DEVELOPER ACCESS" : "YOUR PERSONAL JYOTISH WORKBENCH"}</p>
      <h1 id="login-title">{isDeveloperPortal ? (isRegistration ? "Create a LIFE account" : "Developer sign in") : (isRegistration ? "Create your LIFE account" : "Sign in to continue")}</h1>
      <p>{isDeveloperPortal
        ? "New accounts start with standard LIFE access. Developer permissions and API product access are assigned separately by an authorized administrator."
        : isRegistration ? "Create an account to access your chart studio. Birth details are entered later, inside Chart Studio." : "Your chart studio and saved chart data are available after you sign in."}</p>
      <AccountPanel key={initialMode} chart={null} profileDraft={{}} onLoadProfile={() => {}} onLoadSavedChart={() => {}} language="en" returnTo={returnTo} initialMode={initialMode} lockAuthMode authPortal={portal} />
      <a className="login-home-link" href="/">Return to LIFE</a>
    </section>
  </main>;
}
