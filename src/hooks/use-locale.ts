import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n";

const KEY = "travy.locale";

export function useLocale(): [Locale, (l: Locale) => void] {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const stored = (typeof window !== "undefined" && (localStorage.getItem(KEY) as Locale)) || "en";
    setLocaleState(stored === "vn" ? "vn" : "en");
  }, []);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    if (typeof window !== "undefined") localStorage.setItem(KEY, l);
  };

  return [locale, setLocale];
}
