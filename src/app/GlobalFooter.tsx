import DeveloperFooterSection from "./DeveloperFooterSection";

export default function GlobalFooter() {
  return <footer className="global-footer">
    <a className="global-footer-brand" href="/" aria-label="LIFE home"><span aria-hidden="true">✳</span> LIFE</a>
    <p>Personalized Jyotish insights for life's important moments.</p>
    <nav aria-label="Global footer navigation">
      <a href="/#about">About</a>
      <a href="/#contact">Contact</a>
      <a href="/palmistry">Palmistry</a>
      <DeveloperFooterSection />
      <a href="/privacy-policy">Privacy</a>
      <a href="/terms-and-conditions">Terms</a>
      <a href="/disclaimer">Disclaimer</a>
      <a href="/refund-policy">Refund policy</a>
    </nav>
  </footer>;
}
