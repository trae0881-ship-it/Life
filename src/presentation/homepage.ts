export const homepageNavigation = [
  { label: "Home", href: "#home", sectionId: "home" },
  { label: "About Us", href: "#about", sectionId: "about" },
  { label: "Blog", href: "#blog", sectionId: "blog" },
  { label: "Contact Us", href: "#contact", sectionId: "contact" },
  { label: "Login / Sign Up", href: "/signup?next=%2Fdashboard", sectionId: "account" },
] as const;

export const homepageFeatures = [
  { title: "Birth chart", description: "Generate a D1 chart from your birth details and selected calculation settings.", href: "/studio#birth-form" },
  { title: "Lagna", description: "Inspect the calculated ascendant and house cusps in your chart results.", href: "/studio#birth-form" },
  { title: "Rashi", description: "Review calculated sidereal sign placements alongside planetary positions.", href: "/studio#birth-form" },
  { title: "Nakshatra", description: "See the calculated lunar nakshatra and pada in the chart results.", href: "/studio#birth-form" },
  { title: "Vimshottari Dasha", description: "Explore the calculated Mahadasha, Antardasha and Pratyantardasha periods.", href: "/studio#birth-form" },
  { title: "D1–D60 vargas", description: "Compare divisional-chart placements calculated from the same birth inputs.", href: "/studio#birth-form" },
] as const;

export const featuredTools = [
  { title: "Life timeline", description: "Explore a calendar-based age and date timeline. It does not predict life events.", href: "/life-timeline", icon: "01" },
  { title: "Remedy reference", description: "Browse the existing categorized reference catalog.", href: "/remedies", icon: "02" },
  { title: "Marriage timing", description: "Review documented input and limitation guidance; event-timing rules are not implemented.", href: "/marriage-timing", icon: "03" },
  { title: "Ask My Kundli", description: "Use deterministic, rule-based answers from a calculated chart.", href: "/dashboard/assistant", icon: "04" },
] as const;

export function carouselScrollOffset(current: number, viewport: number, maximum: number, direction: -1 | 1) {
  return Math.max(0, Math.min(maximum, current + direction * Math.max(viewport * 0.8, 240)));
}
