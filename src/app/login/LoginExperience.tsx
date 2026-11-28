"use client";

import { useRef } from "react";
import Link from "next/link";
import AccountPanel from "../AccountPanel";
import CosmicAuthScene from "./CosmicAuthScene";
import { useAuthExperienceMotion } from "./useAuthExperienceMotion";

export default function LoginExperience({ returnTo, initialMode = "login", portal = "standard" }: { returnTo: string; initialMode?: "login" | "register"; portal?: "standard" | "developer" }) {
  const isRegistration = initialMode === "register";
  const isDeveloperPortal = portal === "developer";
  const root = useRef<HTMLElement>(null);
  useAuthExperienceMotion(root);

  const accountHref = isRegistration
    ? isDeveloperPortal ? "/developer/login" : "/login"
    : isDeveloperPortal ? "/developer/signup" : "/signup";
  const accountLinkLabel = isRegistration
    ? isDeveloperPortal ? "Developer Login" : "Login / Sign In"
    : isDeveloperPortal ? "Create Developer Account" : "Create Account / Sign Up";

  return <main className="login-page" ref={root}>
    <header className="login-header">
      <Link className="login-brand" href="/" aria-label="LIFE home"><span aria-hidden="true">✳</span> LIFE</Link>
      <nav className="login-account-nav" aria-label="Account navigation">
        {isRegistration
          ? <Link href={isDeveloperPortal ? "/developer/login" : "/login"}>{isDeveloperPortal ? "Developer Login" : "Login / Sign In"}</Link>
          : <Link href={isDeveloperPortal ? "/developer/signup" : "/signup"}>{isDeveloperPortal ? "Create Developer Account" : "Create Account / Sign Up"}</Link>}
      </nav>
    </header>
    <div className="auth-layout">
      <section className="auth-cosmic-panel" aria-label="LIFE astrology platform">
        <CosmicAuthScene />
        <div className="auth-cosmic-copy">
          <p className="auth-eyebrow" data-auth-enter><span aria-hidden="true" /> {isDeveloperPortal ? "TOOLS FOR BUILDERS" : "A MORE PERSONAL VIEW OF THE COSMOS"}</p>
          <h1 data-auth-enter>{isDeveloperPortal ? "Build with clarity." : "Your Cosmic Journey Begins Here"}</h1>
          <p data-auth-enter>{isDeveloperPortal
            ? "Explore the LIFE developer platform with transparent access and documented boundaries."
            : "Explore astrology, numerology and personal insights through clear calculations and thoughtful interpretation."}</p>
          <div className="auth-cosmic-foot" data-auth-enter><span>LOCAL CALCULATIONS</span><i aria-hidden="true" /><span>YOUR DATA, YOUR JOURNEY</span></div>
        </div>
        <p className="auth-cosmic-signature" aria-hidden="true">LIFE · JYOTISH WORKBENCH</p>
      </section>

      <section className="auth-form-panel" aria-labelledby="login-title">
        <div className="login-card">
          <div className="auth-card-brand" data-auth-enter><span aria-hidden="true">✳</span><span>LIFE</span></div>
          <p className="auth-card-eyebrow" data-auth-enter>{isDeveloperPortal ? "LIFE DEVELOPER ACCESS" : "YOUR PERSONAL JYOTISH WORKBENCH"}</p>
          <h2 id="login-title" data-auth-enter>{isDeveloperPortal ? (isRegistration ? "Create a LIFE account" : "Developer sign in") : (isRegistration ? "Create your account" : "Welcome back")}</h2>
          <p className="auth-card-intro" data-auth-enter>{isDeveloperPortal
            ? "Developer signup creates a review request. Super Admin verifies applications before enabling Developer access; while pending, you can sign in to check your application status."
            : isRegistration ? "Create an account to access your chart studio. Birth details are entered later, inside Chart Studio." : "Sign in to continue to your chart studio and saved readings."}</p>
          <div className="auth-form-content" data-auth-enter>
            <AccountPanel
              key={initialMode}
              chart={null}
              profileDraft={{}}
              onLoadProfile={() => {}}
              onLoadSavedChart={() => {}}
              language="en"
              returnTo={returnTo}
              initialMode={initialMode}
              lockAuthMode
              authPortal={portal}
              showRememberMe={!isRegistration && !isDeveloperPortal}
            />
          </div>
          <p className="auth-switch-copy" data-auth-enter>
            {isRegistration ? "Already have an account?" : "New to LIFE?"}{" "}
            <Link href={accountHref}>{isRegistration ? "Sign in" : "Create an account"}</Link>
          </p>
          <Link className="login-home-link" href="/" data-auth-enter>Return to LIFE</Link>
        </div>
      </section>
    </div>
  </main>;
}
