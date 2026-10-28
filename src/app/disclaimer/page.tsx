import type { Metadata } from "next";
import LegalDocument from "../LegalDocument";
import { metadataForManagedPage } from "@/server/seo-management";

export async function generateMetadata(): Promise<Metadata> {
  return metadataForManagedPage("/disclaimer");
}

export default function DisclaimerPage() {
  return <LegalDocument kind="disclaimer" />;
}
