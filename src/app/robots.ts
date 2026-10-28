import type { MetadataRoute } from "next";
import { createRobotsMetadata, getPublicSiteOrigin } from "@/server/seo-management";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  return createRobotsMetadata(getPublicSiteOrigin());
}