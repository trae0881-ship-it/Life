import DeveloperFooterSection from "./DeveloperFooterSection";

export default function GlobalFooter() {
  return <footer className="global-footer">
    <a className="global-footer-brand" href="/" aria-label="LIFE home"><span aria-hidden="true">✳</span> LIFE</a>
    <p>Jyotish workbench · Local astronomical calculations · AGPL-3.0-or-later</p>
    <nav aria-label="Global footer navigation">
      <a href="/#about">About</a>
      <a href="/blogs">Blog</a>
      <a href="/#contact">Contact</a>
      <a href="/developers">Documentation</a>
      <a href="/api/docs">API documentation</a>
      <DeveloperFooterSection />
      <a href="/references">References</a>
      <a href="/privacy-policy">Privacy</a>
      <a href="/terms-and-conditions">Terms</a>
      <a href="/disclaimer">Disclaimer</a>
      <a href="/refund-policy">Refund policy</a>
    </nav>
  </footer>;
}
