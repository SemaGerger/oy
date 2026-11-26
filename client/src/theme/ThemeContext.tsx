import React, { createContext, useContext, useState, useEffect } from "react";
import { EventBus } from "../game/EventBus";

export type AppTheme = "fun" | "office"; // "fun" = Dark Normal Eğlence Modu, "office" = Light Ofis Modu

interface ThemeContextValue {
  theme: AppTheme;
  isOffice: boolean;
  toggleTheme: () => void;
  setTheme: (t: AppTheme) => void;
}

const STORAGE_KEY = "sitecont_theme_mode";

const ThemeContext = createContext<ThemeContextValue>({
  theme: "fun",
  isOffice: false,
  toggleTheme: () => {},
  setTheme: () => {},
});

export function getSavedTheme(): AppTheme {
  try {
    const val = localStorage.getItem(STORAGE_KEY);
    if (val === "office" || val === "fun") return val;
  } catch {
    // ignore
  }
  return "fun";
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<AppTheme>(getSavedTheme);

  const setTheme = (next: AppTheme) => {
    setThemeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
  };

  const toggleTheme = () => {
    setTheme(theme === "fun" ? "office" : "fun");
  };

  useEffect(() => {
    const isOffice = theme === "office";
    document.title = isOffice
      ? "Q4 Proje Takip — Sitecont Workspace"
      : "Sitecont Game";
    document.body.style.backgroundColor = isOffice ? "#f8fafc" : "#18181b";
    EventBus.emit("theme-changed", theme);
  }, [theme]);

  // Global panic shortcut: Shift + O toggles Office Mode instantly
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && (e.key === "O" || e.key === "o")) {
        const tag = (e.target as HTMLElement | null)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        setThemeState((prev) => {
          const next = prev === "fun" ? "office" : "fun";
          try {
            localStorage.setItem(STORAGE_KEY, next);
          } catch {
            // ignore
          }
          return next;
        });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isOffice: theme === "office",
        toggleTheme,
        setTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
