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
  selectableThemes: ThemeConfig[];
  currentActiveTheme: ThemeConfig;
  effectiveType: "light" | "dark";
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const availableThemes: ThemeConfig[] = [
  {
    id: "catppuccin-mocha",
    name: "Catppuccin Mocha",
    type: "dark",
    variables: {
      background: "240 21% 15%", // Base #1E1E2E
      foreground: "226 64% 88%", // Text #CDD6F4
      card: "240 21% 12%", // Mantle #181825
      "card-foreground": "226 64% 88%",
      primary: "267 84% 81%", // Mauve #CBA6F7
      "primary-foreground": "240 21% 9%", // Crust #11111B
      secondary: "240 21% 9%", // Crust #11111B
      "secondary-foreground": "226 64% 88%",
      muted: "240 21% 12%",
      "muted-foreground": "233 10% 47%", // Overlay0 #6C7086
      accent: "237 16% 23%", // Surface0 #313244
      "accent-foreground": "267 84% 81%", // Mauve #CBA6F7
      destructive: "343 81% 75%", // Red #F38BA8
      "destructive-foreground": "240 21% 9%",
      border: "237 16% 23%",
      input: "235 13% 31%", // Surface1 #45475A
      ring: "267 84% 81%"
    }
  },
  {
    id: "catppuccin-macchiato",
    name: "Catppuccin Macchiato",
    type: "dark",
    variables: {
      background: "232 23% 18%", // Base #24273A
      foreground: "227 70% 88%", // Text #CAD3F5
      card: "233 23% 15%", // Mantle #1E2030
      "card-foreground": "227 70% 88%",
      primary: "267 83% 80%", // Mauve #C6A0F6
      "primary-foreground": "236 23% 12%", // Crust #181926
      secondary: "236 23% 12%", // Crust #181926
      "secondary-foreground": "227 70% 88%",
      muted: "233 23% 15%",
      "muted-foreground": "230 12% 49%", // Overlay0 #6E738D
      accent: "230 19% 26%", // Surface0 #363A4F
      "accent-foreground": "267 83% 80%", // Mauve #C6A0F6
      destructive: "351 74% 73%", // Red #ED8796
      "destructive-foreground": "236 23% 12%",
      border: "230 19% 26%",
      input: "231 16% 34%", // Surface1 #494D64
      ring: "267 83% 80%"
    }
  },
  {
    id: "catppuccin-frappe",
    name: "Catppuccin Frappé",
    type: "dark",
    variables: {
      background: "229 19% 23%", // Base #303446
      foreground: "227 70% 87%", // Text #C6D0F5
      card: "231 19% 20%", // Mantle #292C3C
      "card-foreground": "227 70% 87%",
      primary: "277 59% 76%", // Mauve #CA9EE6
      "primary-foreground": "229 20% 17%", // Crust #232634
      secondary: "229 20% 17%", // Crust #232634
      "secondary-foreground": "227 70% 87%",
      muted: "231 19% 20%",
      "muted-foreground": "229 13% 52%", // Overlay0 #737994
      accent: "230 16% 30%", // Surface0 #414559
      "accent-foreground": "277 59% 76%", // Mauve #CA9EE6
      destructive: "359 68% 71%", // Red #E78284
      "destructive-foreground": "229 20% 17%",
      border: "230 16% 30%",
      input: "227 15% 37%", // Surface1 #51576D
      ring: "277 59% 76%"
    }
  },
  {
    id: "catppuccin-latte",
    name: "Catppuccin Latte",
    type: "light",
    variables: {
      background: "220 23% 95%", // Base #EFF1F5
      foreground: "234 16% 35%", // Text #4C4F69
      card: "220 22% 92%", // Mantle #E6E9EF
      "card-foreground": "234 16% 35%",
      primary: "266 85% 58%", // Mauve #8839EF
      "primary-foreground": "0 0% 100%",
      secondary: "220 21% 89%", // Crust #DCE0E8
      "secondary-foreground": "234 16% 35%",
      muted: "220 22% 92%",
      "muted-foreground": "228 11% 65%", // Overlay0 #9CA0B0
      accent: "223 16% 83%", // Surface0 #CCD0DA
      "accent-foreground": "266 85% 58%", // Mauve #8839EF
      destructive: "347 87% 44%", // Red #D20F39
      "destructive-foreground": "0 0% 100%",
      border: "223 16% 83%",
      input: "225 14% 77%", // Surface1 #BCC0CC
      ring: "266 85% 58%"
    }
  }
];

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    return (localStorage.getItem("settings_theme_mode") as ThemeMode) || "system";
  });

  const [selectedThemeId, setSelectedThemeIdState] = useState<string>(() => {
    return localStorage.getItem("settings_theme_id") || "catppuccin-mocha";
  });

  const [systemTheme, setSystemTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  // Selectable themes in Theme Picker: always expose all 4 Catppuccin themes
  const selectableThemes = availableThemes;

  // Determine current active theme — independent state decoupling
  const currentActiveTheme: ThemeConfig = React.useMemo(() => {
    if (selectedThemeId) {
      const found = availableThemes.find((t) => t.id === selectedThemeId);
      if (found) {
        return found;
      }
    }

    if (themeMode === "light") {
      return availableThemes.find((t) => t.id === "catppuccin-latte") || availableThemes[3];
    }
    if (themeMode === "dark") {
      return availableThemes.find((t) => t.id === "catppuccin-mocha") || availableThemes[0];
    }

    return systemTheme === "light"
      ? availableThemes.find((t) => t.id === "catppuccin-latte") || availableThemes[3]
      : availableThemes.find((t) => t.id === "catppuccin-mocha") || availableThemes[0];
  }, [themeMode, selectedThemeId, systemTheme]);

  const effectiveType = currentActiveTheme.type;
  const activeThemeId = currentActiveTheme.id;

  // Independent Appearance Mode mutator — NEVER modifies selectedThemeId
  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    localStorage.setItem("settings_theme_mode", mode);
  };

  // Independent Theme mutator — NEVER modifies themeMode
  const setSelectedThemeId = (themeId: string) => {
    setSelectedThemeIdState(themeId);
    localStorage.setItem("settings_theme_id", themeId);
  };

  // Apply theme variables dynamically to document root element
  useEffect(() => {
    const root = document.documentElement;
    
    // Set data-theme attribute
    root.setAttribute("data-theme", currentActiveTheme.id);

    // Apply new CSS variable values
    Object.entries(currentActiveTheme.variables).forEach(([key, val]) => {
      root.style.setProperty(`--${key}`, val);
    });

    // Dark Reader and browser compatibility
    root.style.setProperty("color-scheme", currentActiveTheme.type);

    if (currentActiveTheme.type === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [currentActiveTheme]);

  // Sync with system theme changes when mode is set to system
  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? "dark" : "light");
    };

    mediaQuery.addEventListener("change", handleSystemChange);
    return () => mediaQuery.removeEventListener("change", handleSystemChange);
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        selectedThemeId: activeThemeId,
        setThemeMode,
        setSelectedThemeId,
        availableThemes,
        selectableThemes,
        currentActiveTheme,
        effectiveType,
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
