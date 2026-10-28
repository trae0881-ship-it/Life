import type { Metadata } from "next";
import SwaggerApiDocs from "./SwaggerApiDocs";
import { LIFE_OPENAPI } from "@/server/openapi";
import "../../super-admin/super-admin.css";

export const metadata: Metadata = {
  title: "LIFE API Documentation",
  robots: { index: false, follow: false },
};

export default function ApiDocsPage() {
  const operations = Object.entries(LIFE_OPENAPI.paths).flatMap(([path, methods]) =>
    Object.entries(methods).map(([method, operation]) => {
      const requestExample = "requestBody" in operation
        ? operation.requestBody?.content?.["application/json"]?.example
        : undefined;
      return {
        path,
        method: method === "get" ? "GET" as const : "POST" as const,
        summary: operation.summary,
        responses: Object.keys(operation.responses),
        requiresSession: path !== "/api/health" && "security" in operation,
        requestExample,
      };
    }),
  );
  return <SwaggerApiDocs operations={operations} />;
}
