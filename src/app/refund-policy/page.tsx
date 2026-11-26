import type { Metadata } from "next";
import LegalDocument from "../LegalDocument";
import { metadataForManagedPage } from "@/server/seo-management";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return metadataForManagedPage("/refund-policy");
}

export default function RefundPolicyPage() {
  return <LegalDocument kind="refund" />;
}
