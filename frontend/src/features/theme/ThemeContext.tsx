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
    id: "vercel-dark",
    name: "Vercel Dark",
    type: "dark",
    variables: {
      background: "0 0% 0%",
      foreground: "0 0% 100%",
      card: "0 0% 8%",
      "card-foreground": "0 0% 100%",
      primary: "0 0% 100%",
      "primary-foreground": "0 0% 0%",
      secondary: "0 0% 12%",
      "secondary-foreground": "0 0% 100%",
      muted: "0 0% 12%",
      "muted-foreground": "0 0% 63%",
      accent: "0 0% 18%",
      "accent-foreground": "0 0% 100%",
      destructive: "0 84% 60%",
      "destructive-foreground": "0 0% 100%",
      border: "0 0% 15%",
      input: "0 0% 15%",
      ring: "0 0% 100%"
    }
  },
  {
    id: "raycast-dark",
    name: "Raycast Dark",
    type: "dark",
    variables: {
      background: "240 10% 4%",
      foreground: "240 5% 90%",
      card: "240 7% 10%",
      "card-foreground": "240 5% 90%",
      primary: "262 80% 60%", // Raycast Purple
      "primary-foreground": "0 0% 100%",
      secondary: "240 6% 13%",
      "secondary-foreground": "240 5% 90%",
      muted: "240 6% 13%",
      "muted-foreground": "240 4% 50%",
      accent: "240 5% 18%",
      "accent-foreground": "262 80% 60%",
      destructive: "0 84% 60%",
      "destructive-foreground": "0 0% 100%",
      border: "240 5% 16%",
      input: "240 5% 16%",
      ring: "262 80% 60%"
    }
  },
  {
    id: "dracula",
    name: "Dracula",
    type: "dark",
    variables: {
      background: "231 15% 18%",
      foreground: "60 30% 96%",
      card: "232 14% 25%",
      "card-foreground": "60 30% 96%",
      primary: "326 100% 74%", // Dracula Pink
      "primary-foreground": "231 15% 18%",
      secondary: "231 15% 14%",
      "secondary-foreground": "60 30% 96%",
      muted: "231 15% 14%",
      "muted-foreground": "225 27% 65%",
      accent: "250 100% 75%", // Dracula Purple
      "accent-foreground": "326 100% 74%",
      destructive: "0 100% 67%",
      "destructive-foreground": "231 15% 18%",
      border: "231 15% 30%",
      input: "231 15% 30%",
      ring: "250 100% 75%"
    }
  },
  {
    id: "nord",
    name: "Nord",
    type: "dark",
    variables: {
      background: "220 16% 16%",
      foreground: "218 27% 92%",
      card: "220 16% 22%",
      "card-foreground": "218 27% 92%",
      primary: "193 43% 67%", // Nord Frost
      "primary-foreground": "220 16% 16%",
      secondary: "220 16% 14%",
      "secondary-foreground": "218 27% 92%",
      muted: "220 16% 14%",
      "muted-foreground": "218 10% 55%",
      accent: "220 16% 28%",
      "accent-foreground": "193 43% 67%",
      destructive: "354 42% 56%",
      "destructive-foreground": "218 27% 92%",
      border: "220 16% 28%",
      input: "220 16% 28%",
      ring: "193 43% 67%"
    }
  },
  {
    id: "vercel-light",
    name: "Vercel Light",
    type: "light",
    variables: {
      background: "0 0% 100%",
      foreground: "0 0% 0%",
      card: "0 0% 97%",
      "card-foreground": "0 0% 0%",
      primary: "0 0% 0%",
      "primary-foreground": "0 0% 100%",
      secondary: "0 0% 95%",
      "secondary-foreground": "0 0% 0%",
      muted: "0 0% 95%",
      "muted-foreground": "0 0% 40%",
      accent: "0 0% 90%",
      "accent-foreground": "0 0% 0%",
      destructive: "0 84% 60%",
      "destructive-foreground": "0 0% 100%",
      border: "0 0% 88%",
      input: "0 0% 88%",
      ring: "0 0% 0%"
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
  },
  {
    id: "github-light",
    name: "GitHub Light",
    type: "light",
    variables: {
      background: "0 0% 100%",
      foreground: "210 12% 16%",
      card: "210 17% 98%",
      "card-foreground": "210 12% 16%",
      primary: "212 92% 43%", // GitHub Blue
      "primary-foreground": "0 0% 100%",
      secondary: "210 15% 95%",
      "secondary-foreground": "210 12% 16%",
      muted: "210 15% 95%",
      "muted-foreground": "210 10% 40%",
      accent: "210 15% 90%",
      "accent-foreground": "212 92% 43%",
      destructive: "354 70% 54%",
      "destructive-foreground": "0 0% 100%",
      border: "210 15% 90%",
      input: "210 15% 90%",
      ring: "212 92% 43%"
    }
  },
  {
    id: "paper",
    name: "Paper",
    type: "light",
    variables: {
      background: "40 23% 97%",
      foreground: "0 0% 15%",
      card: "40 18% 94%",
      "card-foreground": "0 0% 15%",
      primary: "0 0% 15%",
      "primary-foreground": "40 23% 97%",
      secondary: "40 15% 90%",
      "secondary-foreground": "0 0% 15%",
      muted: "40 15% 90%",
      "muted-foreground": "40 8% 45%",
      accent: "40 12% 83%",
      "accent-foreground": "0 0% 15%",
      destructive: "0 68% 50%",
      "destructive-foreground": "40 23% 97%",
      border: "40 12% 83%",
      input: "40 12% 83%",
      ring: "0 0% 15%"
    }
  },
  {
    id: "solarized-light",
    name: "Solarized Light",
    type: "light",
    variables: {
      background: "44 87% 94%",
      foreground: "194 14% 28%",
      card: "46 76% 90%",
      "card-foreground": "194 14% 28%",
      primary: "18 80% 44%", // Solarized Orange
      "primary-foreground": "44 87% 94%",
      secondary: "46 76% 85%",
      "secondary-foreground": "194 14% 28%",
      muted: "46 76% 85%",
      "muted-foreground": "192 10% 44%",
      accent: "194 36% 80%",
      "accent-foreground": "18 80% 44%",
      destructive: "353 60% 48%",
      "destructive-foreground": "44 87% 94%",
      border: "46 76% 80%",
      input: "46 76% 80%",
      ring: "18 80% 44%"
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

  const getSystemTheme = (): "light" | "dark" => {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  };

  const getActiveTheme = (mode: ThemeMode, themeId: string): ThemeConfig => {
    const selected = availableThemes.find((t) => t.id === themeId);
    if (!selected) return availableThemes[0];

    if (mode === "system") {
      const sysType = getSystemTheme();
      // If selected theme matches the system type, use it
      if (selected.type === sysType) return selected;
      // Otherwise use the default theme for that system type
      return sysType === "dark" 
        ? availableThemes.find((t) => t.id === "catppuccin-mocha") || availableThemes[0]
        : availableThemes.find((t) => t.id === "vercel-light") || availableThemes[5];
    }

    // Force theme selection matching forced mode
    if (mode === "dark" && selected.type === "light") {
      // Fallback to default dark
      return availableThemes.find((t) => t.id === "catppuccin-mocha") || availableThemes[0];
    }
    if (mode === "light" && selected.type === "dark") {
      // Fallback to default light
      return availableThemes.find((t) => t.id === "vercel-light") || availableThemes[5];
    }

    return selected;
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
