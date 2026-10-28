import type { Metadata } from "next";
import HomepageSections from "./HomepageSections";
import { metadataForManagedPage } from "@/server/seo-management";
import "./homepage.css";

export async function generateMetadata(): Promise<Metadata> {
  return metadataForManagedPage("/");
}

export default function HomePage() {
  return <main><HomepageSections language="en" /></main>;
}
