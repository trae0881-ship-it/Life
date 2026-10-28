"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

type RuntimeScript = { id: string; placement: "HEAD" | "BODY_START" | "BODY_END"; snippet: string };

export default function ScriptInjector() {
  const pathname = usePathname();
  const enabled = process.env.NEXT_PUBLIC_LIFE_MANAGED_SCRIPTS_ENABLED === "true";

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    let generation = 0;
    let inserted: HTMLScriptElement[] = [];

    const clear = () => {
      for (const element of inserted) element.remove();
      inserted = [];
    };

    const inject = async () => {
      const currentGeneration = ++generation;
      clear();
      const query = new URLSearchParams({ path: pathname });
      try {
        const response = await fetch(`/api/site-scripts?${query}`, { cache: "no-store" });
        if (response.status === 503) {
          console.warn("LIFE managed scripts are unavailable until their database migration is applied.");
          return;
        }
        if (!response.ok) throw new Error(`Runtime scripts returned HTTP ${response.status}.`);
        const result: unknown = await response.json();
        if (!result || typeof result !== "object" || !("scripts" in result) || !Array.isArray(result.scripts)) {
          throw new Error("Runtime scripts response was invalid.");
        }
        if (!active || currentGeneration !== generation) return;
        const seen = new Set<string>();
        for (const item of result.scripts) {
          if (!item || typeof item !== "object" || !("id" in item) || typeof item.id !== "string"
            || !("snippet" in item) || typeof item.snippet !== "string"
            || !("placement" in item) || !["HEAD", "BODY_START", "BODY_END"].includes(item.placement as string)) {
            throw new Error("Runtime script entry was invalid.");
          }
          if (seen.has(item.id)) continue;
          seen.add(item.id);
          const element = document.createElement("script");
          element.id = `life-managed-script-${item.id}`;
          element.dataset.lifeManagedScript = "true";
          element.textContent = item.snippet;
          if (item.placement === "HEAD") document.head.append(element);
          else if (item.placement === "BODY_START") document.body.insertBefore(element, document.body.firstChild);
          else document.body.append(element);
          inserted.push(element);
        }
      } catch (error) {
        if (active) console.error("LIFE managed scripts could not be applied.", error);
      }
    };

    const refresh = () => { void inject(); };
    window.addEventListener("life-managed-scripts-changed", refresh);
    void inject();
    return () => {
      active = false;
      window.removeEventListener("life-managed-scripts-changed", refresh);
      clear();
    };
  }, [enabled, pathname]);

  return null;
}
