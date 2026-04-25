import { useEffect } from "react";
import type { UiPreferences } from "@/types/profile";

export function useApplyAccessibility(prefs: UiPreferences) {
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--font-scale", String(prefs.fontScale));
    root.dataset.spacing = prefs.extraSpacing ? "extra" : "default";
    root.dataset.lineWidth = prefs.maxLineWidth;
    root.dataset.largePrint = prefs.fontScale >= 2 ? "true" : "false";
    root.dataset.reducedMotion = prefs.reducedMotion ? "true" : "false";
  }, [prefs]);
}
