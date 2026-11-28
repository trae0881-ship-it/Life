"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import AstrologyFaq from "./AstrologyFaq";
import CosmicSolarSystem from "./CosmicSolarSystem";
import { carouselScrollOffset, featuredTools, homepageFeatures, homepageNavigation } from "@/presentation/homepage";
import type { Language } from "@/presentation/language";

export default function HomepageSections({ language }: { language: Language }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [scroll, setScroll] = useState({ left: 0, maximum: 0, viewport: 0 });
  const menuButton = useRef<HTMLButtonElement>(null);
  const carousel = useRef<HTMLDivElement>(null);
  const reduceMotion = useRef(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => { reduceMotion.current = media.matches; };
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const refreshAuthentication = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      if (!response.ok) {
        setAuthenticated(false);
        return;
      }
      const result = await response.json() as { user: { id: string } | null };
      setAuthenticated(Boolean(result.user));
    } catch {
      setAuthenticated(false);
    }
  }, []);

  useEffect(() => {
    void refreshAuthentication();
    window.addEventListener("life-account-changed", refreshAuthentication);
    return () => window.removeEventListener("life-account-changed", refreshAuthentication);
  }, [refreshAuthentication]);

  useEffect(() => {
    const element = carousel.current;
    if (!element) return;
    updateScroll();
    const observer = new ResizeObserver(updateScroll);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMenuOpen(false);
      window.setTimeout(() => menuButton.current?.focus({ preventScroll: true }), 0);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  function updateScroll() {
    const element = carousel.current;
    if (element) setScroll({ left: element.scrollLeft, maximum: element.scrollWidth - element.clientWidth, viewport: element.clientWidth });
  }

  function scrollTools(direction: -1 | 1) {
    const element = carousel.current;
    if (!element) return;
    const maximum = element.scrollWidth - element.clientWidth;
    const left = carouselScrollOffset(element.scrollLeft, element.clientWidth, maximum, direction);
    element.scrollTo({ left, behavior: "instant" });
  }

  function closeNavigation() {
    setMenuOpen(false);
    if (window.matchMedia("(max-width: 760px)").matches) {
      window.setTimeout(() => menuButton.current?.focus({ preventScroll: true }), 0);
    }
  }

  async function signOut() {
    setAuthMessage("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("logout unavailable");
      setAuthenticated(false);
      setMenuOpen(false);
      window.location.assign("/");
    } catch {
      setAuthMessage("Sign out could not be completed. Please try again.");
    }
  }

  return <>
    <header className="site-header">
      <a className="site-brand" href="#home" aria-label="LIFE home"><span aria-hidden="true">✳</span> LIFE</a>
      <button ref={menuButton} className="site-menu-toggle" type="button" aria-expanded={menuOpen} aria-controls="site-navigation" aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"} onClick={() => setMenuOpen((open) => !open)}>
        <span aria-hidden="true">{menuOpen ? "×" : "☰"}</span><span className="site-menu-label">{menuOpen ? "Close" : "Menu"}</span>
      </button>
      <nav id="site-navigation" className="site-navigation" data-open={menuOpen} aria-label="Main navigation">
        {homepageNavigation.filter((item) => item.sectionId !== "account").map((item) => <a key={item.sectionId} href={item.href} onClick={closeNavigation}>{item.label}</a>)}
        {authenticated ? <>
          <a className="site-nav-account" href="/dashboard" onClick={closeNavigation}>Dashboard / Account</a>
          <button className="site-nav-signout" type="button" onClick={() => void signOut()}>Sign out</button>
        </> : <>
          <a className="site-nav-account" href="/login">Login / Sign In</a>
          <a className="site-nav-account" href="/signup">Create Account / Sign Up</a>
        </>}
      </nav>
      {authMessage && <p className="site-auth-message" role="alert">{authMessage}</p>}
    </header>

    <div className="homepage">
      <section className="home-hero" id="home" aria-labelledby="home-title">
        <div className="home-hero-copy">
          <p className="home-eyebrow"><span /> A thoughtful Jyotish companion</p>
          <h1 id="home-title">Discover your chart.<br /><em>Explore your path.</em></h1>
          <p className="home-hero-intro">Explore your Vedic birth chart, planetary placements, and personalized traditional readings.</p>
          <div className="home-actions">
            <a className="home-button home-button-primary" href="/studio#birth-form">Generate My Kundli <span aria-hidden="true">↗</span></a>
            <a className="home-button home-button-secondary" href="#astrology">Explore Astrology <span aria-hidden="true">↓</span></a>
          </div>
          <p className="home-quiet-note">Your birth details help create a personal Kundali experience.</p>
        </div>
        <CosmicSolarSystem />
      </section>

      <section className="home-section home-feature-section" id="astrology" aria-labelledby="feature-title">
        <div className="home-section-heading"><div><p className="home-eyebrow">ASTROLOGY, MADE EXPLORABLE</p><h2 id="feature-title">Start with the chart.<br /><em>Go deeper at your pace.</em></h2></div><p>Each view comes from your entered birth details and selected settings. No sample charts or pre-filled results.</p></div>
        <div className="home-feature-grid">{homepageFeatures.map((feature, index) => <a className="home-feature-card" href={feature.href} key={feature.title}><span className="home-card-index">0{index + 1}</span><span className="home-feature-symbol" aria-hidden="true">{["◈", "↑", "☾", "✧", "◷", "✳"][index]}</span><h3>{feature.title}</h3><p>{feature.description}</p><span className="home-card-link">Generate a chart <span aria-hidden="true">↗</span></span></a>)}</div>
      </section>

      <section className="home-section home-tools-section" aria-labelledby="tools-title">
        <div className="home-section-heading home-tools-heading"><div><p className="home-eyebrow">A FEW PLACES TO BEGIN</p><h2 id="tools-title">Tools for a closer look</h2></div><div className="carousel-controls"><button type="button" aria-label="Scroll featured tools left" onClick={() => scrollTools(-1)} disabled={scroll.left <= 1}>←</button><button type="button" aria-label="Scroll featured tools right" onClick={() => scrollTools(1)} disabled={scroll.left >= scroll.maximum - 1}>→</button></div></div>
        <div className="home-carousel" ref={carousel} role="region" aria-label="Featured astrology tools" tabIndex={0} onScroll={updateScroll} onKeyDown={(event) => { if (event.key === "ArrowRight") { event.preventDefault(); scrollTools(1); } else if (event.key === "ArrowLeft") { event.preventDefault(); scrollTools(-1); } }}>
          <svg
            className="home-carousel-curve"
            aria-hidden="true"
            focusable="false"
            viewBox="0 0 1200 220"
            preserveAspectRatio="none"
            style={{ width: `${Math.max(scroll.viewport, scroll.maximum + scroll.viewport)}px` }}
          >
            <path className="home-carousel-curve-base" d="M0 110 C100 36 200 36 300 110 S500 184 600 110 S800 36 900 110 S1100 184 1200 110" />
            <path className="home-carousel-curve-flow" d="M0 110 C100 36 200 36 300 110 S500 184 600 110 S800 36 900 110 S1100 184 1200 110" />
          </svg>
          {featuredTools.map((tool) => <a className="home-tool-card" href={tool.href} key={tool.href}><span className="home-tool-number">{tool.icon}</span><span className="home-tool-arrow" aria-hidden="true">↗</span><h3>{tool.title}</h3><p>{tool.description}</p><span className="home-tool-open">Open tool</span></a>)}
        </div>
        <p className="home-carousel-hint">Scroll or swipe to explore · use the arrow keys when the carousel is focused</p>
      </section>

      <section className="home-section home-steps-section" aria-labelledby="steps-title">
        <div className="home-section-heading"><div><p className="home-eyebrow">A SIMPLE PLACE TO START</p><h2 id="steps-title">How it works</h2></div><p>From birth details to your personalized Kundali, in three steps.</p></div>
        <ol className="home-steps"><li><span>01</span><h3>Enter birth details</h3><p>Provide your date, time, and birthplace to begin.</p></li><li><span>02</span><h3>Explore your Kundali</h3><p>View your Lagna, Rashi, Nakshatra, and planetary placements.</p></li><li><span>03</span><h3>Read your report</h3><p>Explore divisional charts, personalized analysis, and Dasha periods.</p></li></ol>
      </section>

      <section className="home-section home-blog-section" id="blog" aria-labelledby="blog-title">
        <div className="home-section-heading"><div><p className="home-eyebrow">FROM THE JOURNAL</p><h2 id="blog-title">Notes on Jyotish</h2></div></div>
        <div className="home-empty-state"><span aria-hidden="true">✧</span><div><h3>No articles published yet</h3><p>When LIFE publishes articles, they’ll appear here. We haven’t added sample or placeholder posts.</p></div></div>
      </section>

      <section className="home-about-section" id="about" aria-labelledby="about-title">
        <div className="about-mark" aria-hidden="true">✳</div><div><p className="home-eyebrow">ABOUT LIFE</p><h2 id="about-title">A Kundali made easy to explore.</h2><p>LIFE brings traditional Jyotish chart details and personalized interpretations together in one place.</p><p>Astrology offers a traditional perspective, not a guarantee of future events or a substitute for professional advice.</p></div>
      </section>

      <section className="home-section home-faq-section" aria-labelledby="home-faq-title"><div className="home-section-heading"><div><p className="home-eyebrow">GOOD TO KNOW</p><h2 id="home-faq-title">Frequently asked questions</h2></div><a href="#faq">Browse all questions ↓</a></div><AstrologyFaq language={language} /></section>

      <section className="home-contact-section" id="contact" aria-labelledby="contact-title"><div><p className="home-eyebrow">CONTACT</p><h2 id="contact-title">We’re still setting up our public contact channel.</h2><p>No support email or contact form has been published yet. We won’t display an invented address.</p></div><a href="/privacy-policy">Privacy information <span aria-hidden="true">↗</span></a></section>

      <section className="home-final-cta"><p className="home-eyebrow">YOUR CHART STARTS WITH YOUR DETAILS</p><h2>Curious about your chart?</h2><p>Enter your birth details to begin. Results are calculated when you submit the form.</p><a className="home-button home-button-primary" href="/studio#birth-form">Generate My Kundli <span aria-hidden="true">↗</span></a></section>
    </div>

  </>;
}
