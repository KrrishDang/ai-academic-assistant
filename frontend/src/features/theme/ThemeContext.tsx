import React, { createContext, useContext, useState, useEffect } from "react";

export interface ThemeConfig {
  id: string;
  name: string;
  type: "light" | "dark";
  variables: {
    background: string;
    foreground: string;
    card: string;
    "card-foreground": string;
    primary: string;
    "primary-foreground": string;
    secondary: string;
    "secondary-foreground": string;
    muted: string;
    "muted-foreground": string;
    accent: string;
    "accent-foreground": string;
    destructive: string;
    "destructive-foreground": string;
    border: string;
    input: string;
    ring: string;
  };
}

export type ThemeMode = "light" | "dark" | "system";

interface ThemeContextType {
  themeMode: ThemeMode;
  selectedThemeId: string;
  setThemeMode: (mode: ThemeMode) => void;
  setSelectedThemeId: (themeId: string) => void;
  availableThemes: ThemeConfig[];
  currentActiveTheme: ThemeConfig;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const availableThemes: ThemeConfig[] = [
  {
    id: "catppuccin-mocha",
    name: "Catppuccin Mocha",
    type: "dark",
    variables: {
      background: "240 21% 9%", // Crust #11111B
      foreground: "226 64% 88%", // Text #CDD6F4
      card: "240 21% 15%", // Base #1E1E2E
      "card-foreground": "226 64% 88%",
      primary: "0 72% 50%", // Deep Red #DC2626
      "primary-foreground": "226 64% 88%",
      secondary: "240 21% 12%", // Mantle #181825
      "secondary-foreground": "226 64% 88%",
      muted: "240 21% 12%",
      "muted-foreground": "233 10% 47%", // Muted #6C7086
      accent: "237 16% 23%", // Borders #313244
      "accent-foreground": "0 72% 50%",
      destructive: "343 81% 75%", // Error #F38BA8
      "destructive-foreground": "240 21% 9%",
      border: "237 16% 23%",
      input: "237 16% 23%",
      ring: "0 72% 50%"
    }
  },
  {
    id: "catppuccin-macchiato",
    name: "Catppuccin Macchiato",
    type: "dark",
    variables: {
      background: "240 19% 14%",
      foreground: "227 70% 87%",
      card: "240 19% 18%",
      "card-foreground": "227 70% 87%",
      primary: "351 74% 63%",
      "primary-foreground": "240 19% 14%",
      secondary: "240 19% 16%",
      "secondary-foreground": "227 70% 87%",
      muted: "240 19% 16%",
      "muted-foreground": "230 13% 55%",
      accent: "238 21% 27%",
      "accent-foreground": "351 74% 63%",
      destructive: "351 74% 63%",
      "destructive-foreground": "240 19% 14%",
      border: "238 21% 27%",
      input: "238 21% 27%",
      ring: "351 74% 63%"
    }
  },
  {
    id: "catppuccin-frappe",
    name: "Catppuccin Frappé",
    type: "dark",
    variables: {
      background: "230 19% 20%",
      foreground: "226 64% 88%",
      card: "231 19% 26%",
      "card-foreground": "226 64% 88%",
      primary: "353 80% 68%",
      "primary-foreground": "230 19% 20%",
      secondary: "230 19% 23%",
      "secondary-foreground": "226 64% 88%",
      muted: "230 19% 23%",
      "muted-foreground": "228 11% 58%",
      accent: "232 16% 35%",
      "accent-foreground": "353 80% 68%",
      destructive: "353 80% 68%",
      "destructive-foreground": "230 19% 20%",
      border: "232 16% 35%",
      input: "232 16% 35%",
      ring: "353 80% 68%"
    }
  },
  {
    id: "catppuccin-latte",
    name: "Catppuccin Latte",
    type: "light",
    variables: {
      background: "220 23% 95%",
      foreground: "234 16% 25%",
      card: "0 0% 100%",
      "card-foreground": "234 16% 25%",
      primary: "349 71% 52%", // Red
      "primary-foreground": "0 0% 100%",
      secondary: "220 22% 92%",
      "secondary-foreground": "234 16% 25%",
      muted: "220 22% 92%",
      "muted-foreground": "231 10% 50%",
      accent: "223 16% 83%",
      "accent-foreground": "349 71% 52%",
      destructive: "349 71% 52%",
      "destructive-foreground": "0 0% 100%",
      border: "223 16% 83%",
      input: "223 16% 83%",
      ring: "349 71% 52%"
    }
  }
];

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    return (localStorage.getItem("settings_theme_mode") as ThemeMode) || "system";
  });
  const [selectedThemeId, setSelectedThemeIdState] = useState<string>(() => {
    const stored = localStorage.getItem("settings_theme_id");
    if (stored && availableThemes.some((t) => t.id === stored)) {
      return stored;
    }
    return "catppuccin-mocha";
  });

  const getSystemTheme = (): "light" | "dark" => {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  };

  const getActiveTheme = (mode: ThemeMode, themeId: string): ThemeConfig => {
    const selected = availableThemes.find((t) => t.id === themeId);
    if (selected) {
      if (mode === "dark" && selected.type === "light") {
        return availableThemes.find((t) => t.id === "catppuccin-mocha") || availableThemes[0];
      }
      if (mode === "light" && selected.type === "dark") {
        return availableThemes.find((t) => t.id === "catppuccin-latte") || availableThemes[3];
      }
      if (mode === "system") {
        const sysType = getSystemTheme();
        if (selected.type === sysType) return selected;
        return sysType === "dark"
          ? availableThemes.find((t) => t.id === "catppuccin-mocha") || availableThemes[0]
          : availableThemes.find((t) => t.id === "catppuccin-latte") || availableThemes[3];
      }
      return selected;
    }
    return availableThemes[0];
  };

  const currentActiveTheme = getActiveTheme(themeMode, selectedThemeId);

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    localStorage.setItem("settings_theme_mode", mode);
  };

  const setSelectedThemeId = (themeId: string) => {
    setSelectedThemeIdState(themeId);
    localStorage.setItem("settings_theme_id", themeId);
  };

  // Apply theme variables dynamically to the document root element
  useEffect(() => {
    const root = document.documentElement;
    
    // Clear inline styles first
    Object.keys(currentActiveTheme.variables).forEach((key) => {
      root.style.removeProperty(`--${key}`);
    });

    // Apply new values
    Object.entries(currentActiveTheme.variables).forEach(([key, val]) => {
      root.style.setProperty(`--${key}`, val);
    });

    root.style.setProperty("color-scheme", currentActiveTheme.type);

    if (currentActiveTheme.type === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [currentActiveTheme]);

  // Sync with system theme changes when mode is set to system
  useEffect(() => {
    if (themeMode !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemChange = () => {
      // Trigger state re-evaluation by setting state
      setThemeModeState("system");
    };

    mediaQuery.addEventListener("change", handleSystemChange);
    return () => mediaQuery.removeEventListener("change", handleSystemChange);
  }, [themeMode]);

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        selectedThemeId,
        setThemeMode,
        setSelectedThemeId,
        availableThemes,
        currentActiveTheme
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
