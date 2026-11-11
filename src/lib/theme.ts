"use client";

import { useSyncExternalStore } from "react";

/**
 * The site's theme is the `dark` class on <html>, set before first paint by the script in app/layout.tsx
 * and saved in localStorage under "edupulse-theme". These helpers read and change it from any component.
 */
const STORAGE_KEY = "edupulse-theme";

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

export function useDarkMode(): boolean {
  return useSyncExternalStore(subscribe, () => document.documentElement.classList.contains("dark"), () => false);
}

export function setDarkMode(dark: boolean) {
  document.documentElement.classList.toggle("dark", dark);
  try { localStorage.setItem(STORAGE_KEY, dark ? "dark" : "light"); } catch {}
}
