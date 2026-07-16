"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";
const ThemeCtx = createContext<{ theme: Theme; toggle: () => void; mounted: boolean }>({
  theme: "dark",
  toggle: () => {},
  mounted: false,
});

export function useTheme() {
  return useContext(ThemeCtx);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Always start from the same value the server renders ("dark") so the first
  // client render matches the SSR output and hydration does not mismatch. The
  // saved theme is read in an effect after mount. The actual colors are already
  // correct before paint thanks to the inline bootstrap script in the root
  // layout, so there is no flash of the wrong theme.
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Reading persisted theme must happen after mount (not during render) to keep
    // the first client render identical to the SSR output. This is the standard
    // SSR-hydration pattern, so the "setState in effect" perf rule does not apply.
    /* eslint-disable react-hooks/set-state-in-effect */
    const saved = localStorage.getItem("fe-theme");
    if (saved === "light" || saved === "dark") {
      setTheme(saved);
    } else {
      // Fall back to whatever the bootstrap script placed on <html>.
      const current = document.documentElement.getAttribute("data-theme");
      if (current === "light") setTheme("light");
    }
    setMounted(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("fe-theme", theme);
  }, [theme, mounted]);

  function toggle() {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }

  return <ThemeCtx.Provider value={{ theme, toggle, mounted }}>{children}</ThemeCtx.Provider>;
}
