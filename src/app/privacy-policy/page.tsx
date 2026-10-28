import type { Metadata } from "next";
import LegalDocument from "../LegalDocument";
import { metadataForManagedPage } from "@/server/seo-management";

export async function generateMetadata(): Promise<Metadata> {
  return metadataForManagedPage("/privacy-policy");
}

export default function PrivacyPolicyPage() {
  return <LegalDocument kind="privacy" />;
}
