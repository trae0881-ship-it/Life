import Link from "next/link";
import styles from "./PublicPageHeader.module.css";

const navigation = [
  { label: "Home", href: "/" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "Palmistry", href: "/palmistry" },
  { label: "KP Astrology", href: "/kp-astrology" },
  { label: "Ank Jyotish", href: "/ank-jyotish" },
  { label: "Tarot", href: "/tarot-reading" },
  { label: "Sign in", href: "/login" },
];

export default function PublicPageHeader() {
  return <header className={styles.header}>
    <Link className={styles.brand} href="/" aria-label="LIFE home"><span aria-hidden="true">✳</span> LIFE</Link>
    <nav className={styles.navigation} aria-label="Main navigation">
      {navigation.map((item) => <Link className={styles.link} href={item.href} key={item.href}>{item.label}</Link>)}
    </nav>
  </header>;
}
