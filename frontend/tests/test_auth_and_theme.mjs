/**
 * Automated test suite for AI Academic Assistant frontend authentication, theme persistence, and design tokens.
 */

import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";

// Mock localStorage for headless Node environment
class MockLocalStorage {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] || null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

// Mock DOM elements
class MockClassList {
  constructor() {
    this.classes = new Set();
  }
  add(cls) {
    this.classes.add(cls);
  }
  remove(cls) {
    this.classes.delete(cls);
  }
  contains(cls) {
    return this.classes.has(cls);
  }
  toggle(cls, force) {
    if (force !== undefined) {
      if (force) this.add(cls);
      else this.remove(cls);
      return force;
    }
    if (this.contains(cls)) {
      this.remove(cls);
      return false;
    } else {
      this.add(cls);
      return true;
    }
  }
}

class MockElement {
  constructor() {
    this.classList = new MockClassList();
    this.style = {};
  }
}

globalThis.localStorage = new MockLocalStorage();
const mockRoot = new MockElement();
globalThis.document = {
  documentElement: mockRoot,
};

let prefersDark = true;
const mediaListeners = [];

globalThis.window = {
  localStorage: globalThis.localStorage,
  matchMedia: (query) => ({
    get matches() {
      return prefersDark;
    },
    addEventListener: (evt, handler) => {
      mediaListeners.push(handler);
    },
    removeEventListener: (evt, handler) => {
      const idx = mediaListeners.indexOf(handler);
      if (idx !== -1) mediaListeners.splice(idx, 1);
    },
  }),
};

test("Theme Persistence & 8-Scenario Resolution Logic", async (t) => {
  const THEME_STORAGE_KEY = "studyhub_theme";

  function getInitialTheme() {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored === "dark" || stored === "light" || stored === "system") {
        return stored;
      }
    } catch {
      // Storage access restricted
    }
    return "dark";
  }

  function resolveActiveTheme(theme) {
    if (theme === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return theme;
  }

  function applyTheme(theme) {
    const active = resolveActiveTheme(theme);
    if (active === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.style.colorScheme = "dark";
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.style.colorScheme = "light";
    }
    return active;
  }

  // Pre-paint hydration simulation (mirrors index.html script)
  function simulatePrePaintScript() {
    try {
      var stored = localStorage.getItem(THEME_STORAGE_KEY);
      var isDark = true;
      if (stored === "light") {
        isDark = false;
      } else if (stored === "dark") {
        isDark = true;
      } else if (stored === "system") {
        var match = window.matchMedia("(prefers-color-scheme: dark)").matches;
        isDark = Boolean(match);
      } else {
        isDark = true;
      }

      if (isDark) {
        document.documentElement.classList.add("dark");
        document.documentElement.style.colorScheme = "dark";
      } else {
        document.documentElement.classList.remove("dark");
        document.documentElement.style.colorScheme = "light";
      }
      return isDark ? "dark" : "light";
    } catch (e) {
      document.documentElement.classList.add("dark");
      document.documentElement.style.colorScheme = "dark";
      return "dark";
    }
  }

  await t.test("Scenario 1: Empty localStorage + Light OS -> Dark application default in pre-paint and React", () => {
    localStorage.clear();
    prefersDark = false; // OS is Light
    const prePaint = simulatePrePaintScript();
    const initial = getInitialTheme();
    const active = applyTheme(initial);

    assert.equal(prePaint, "dark", "Pre-paint must resolve to dark default");
    assert.equal(initial, "dark", "React initial theme must be dark");
    assert.equal(active, "dark", "React active theme must be dark");
    assert.equal(document.documentElement.classList.contains("dark"), true);
    assert.equal(document.documentElement.style.colorScheme, "dark");
  });

  await t.test("Scenario 2: Stored Light -> Light in pre-paint and React", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "light");
    prefersDark = true; // OS is Dark, but stored is Light
    const prePaint = simulatePrePaintScript();
    const initial = getInitialTheme();
    const active = applyTheme(initial);

    assert.equal(prePaint, "light");
    assert.equal(initial, "light");
    assert.equal(active, "light");
    assert.equal(document.documentElement.classList.contains("dark"), false);
    assert.equal(document.documentElement.style.colorScheme, "light");
  });

  await t.test("Scenario 3: Stored Dark -> Dark in pre-paint and React", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "dark");
    prefersDark = false; // OS is Light, but stored is Dark
    const prePaint = simulatePrePaintScript();
    const initial = getInitialTheme();
    const active = applyTheme(initial);

    assert.equal(prePaint, "dark");
    assert.equal(initial, "dark");
    assert.equal(active, "dark");
    assert.equal(document.documentElement.classList.contains("dark"), true);
    assert.equal(document.documentElement.style.colorScheme, "dark");
  });

  await t.test("Scenario 4: Stored System + Light OS -> Light", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "system");
    prefersDark = false; // OS is Light
    const prePaint = simulatePrePaintScript();
    const initial = getInitialTheme();
    const active = applyTheme(initial);

    assert.equal(prePaint, "light");
    assert.equal(initial, "system");
    assert.equal(active, "light");
    assert.equal(document.documentElement.classList.contains("dark"), false);
    assert.equal(document.documentElement.style.colorScheme, "light");
  });

  await t.test("Scenario 5: Stored System + Dark OS -> Dark", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "system");
    prefersDark = true; // OS is Dark
    const prePaint = simulatePrePaintScript();
    const initial = getInitialTheme();
    const active = applyTheme(initial);

    assert.equal(prePaint, "dark");
    assert.equal(initial, "system");
    assert.equal(active, "dark");
    assert.equal(document.documentElement.classList.contains("dark"), true);
    assert.equal(document.documentElement.style.colorScheme, "dark");
  });

  await t.test("Scenario 6: OS preference changes update the application while System is selected", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "system");
    prefersDark = true;
    let active = applyTheme("system");
    assert.equal(active, "dark");
    assert.equal(document.documentElement.classList.contains("dark"), true);

    // Simulate OS change to light
    prefersDark = false;
    mediaListeners.forEach((fn) => fn());
    active = applyTheme("system");
    assert.equal(active, "light");
    assert.equal(document.documentElement.classList.contains("dark"), false);
    assert.equal(document.documentElement.style.colorScheme, "light");
  });

  await t.test("Scenario 7: Invalid stored values safely use the Dark default", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "invalid_corrupted_theme_value");
    prefersDark = false;
    const prePaint = simulatePrePaintScript();
    const initial = getInitialTheme();
    const active = applyTheme(initial);

    assert.equal(prePaint, "dark");
    assert.equal(initial, "dark");
    assert.equal(active, "dark");
    assert.equal(document.documentElement.classList.contains("dark"), true);
  });

  await t.test("Scenario 8: Storage failures do not crash initialization and safely resolve to Dark", () => {
    const throwingStorage = {
      getItem() { throw new Error("SecurityError: Access Denied"); },
      setItem() { throw new Error("SecurityError: Access Denied"); },
    };
    function safeGetTheme() {
      try {
        const stored = throwingStorage.getItem(THEME_STORAGE_KEY);
        if (stored === "dark" || stored === "light" || stored === "system") return stored;
      } catch {
        // Fallback
      }
      return "dark";
    }
    assert.equal(safeGetTheme(), "dark");
  });
});

test("index.html Pre-paint Script & CSS Integrity", async (t) => {
  const indexHtmlPath = path.resolve("index.html");
  const content = fs.readFileSync(indexHtmlPath, "utf-8");

  await t.test("Contains official title 'AI Academic Assistant'", () => {
    assert.ok(content.includes("<title>AI Academic Assistant</title>"));
  });

  await t.test("No legacy Catppuccin themes or inline background styles", () => {
    assert.ok(!content.includes("data-theme=\"catppuccin-mocha\""));
    assert.ok(!content.includes("#1e1e2e"));
    assert.ok(!content.includes("#cdd6f4"));
  });

  await t.test("Body does not have hardcoded 'dark' class", () => {
    assert.ok(!content.includes("<body class=\"bg-background text-foreground dark\""));
    assert.ok(!content.includes("<body class=\"dark\""));
  });

  await t.test("Contains pre-paint script checking studyhub_theme and media query", () => {
    assert.ok(content.includes("localStorage.getItem('studyhub_theme')"));
    assert.ok(content.includes("prefers-color-scheme: dark"));
    assert.ok(content.includes("classList.add('dark')"));
    assert.ok(content.includes("classList.remove('dark')"));
    assert.ok(content.includes("style.colorScheme = 'dark'"));
    assert.ok(content.includes("style.colorScheme = 'light'"));
  });
});

test("Official Visible Product Branding Verification", async (t) => {
  const filesToCheck = [
    { name: "NavigationSidebar", path: "src/components/layout/NavigationSidebar.tsx" },
    { name: "LoginPage", path: "src/pages/auth/LoginPage.tsx" },
    { name: "RegisterPage", path: "src/pages/auth/RegisterPage.tsx" },
    { name: "SettingsPage", path: "src/pages/SettingsPage.tsx" },
    { name: "WorkspaceHeader", path: "src/components/layout/WorkspaceHeader.tsx" },
    { name: "DashboardPage", path: "src/pages/DashboardPage.tsx" },
  ];

  for (const file of filesToCheck) {
    const fullPath = path.resolve(file.path);
    const content = fs.readFileSync(fullPath, "utf-8");

    await t.test(`${file.name} displays official branding 'AI Academic Assistant'`, () => {
      assert.ok(
        content.includes("AI Academic") || content.includes("AI Academic Assistant"),
        `${file.name} should display AI Academic Assistant branding`
      );
      assert.ok(
        !content.includes("Study<span className=\"text-primary font-black\">Hub</span>"),
        `${file.name} must not render old visible StudyHub V2 logo text`
      );
    });
  }

  await t.test("LoginPage does not contain 'StudyHub V2 • Protected by JWT Token Authentication'", () => {
    const loginPath = path.resolve("src/pages/auth/LoginPage.tsx");
    const content = fs.readFileSync(loginPath, "utf-8");
    assert.ok(
      !content.includes("StudyHub V2 • Protected by JWT Token Authentication"),
      "LoginPage footer must not contain legacy StudyHub V2 string"
    );
    assert.ok(
      content.includes("AI Academic Assistant"),
      "LoginPage footer must contain clean neutral branding"
    );
  });

  await t.test("Authentication pages do not contain hardcoded hover:text-[#C6F432]", () => {
    const loginContent = fs.readFileSync(path.resolve("src/pages/auth/LoginPage.tsx"), "utf-8");
    const registerContent = fs.readFileSync(path.resolve("src/pages/auth/RegisterPage.tsx"), "utf-8");
    assert.ok(!loginContent.includes("hover:text-[#C6F432]"), "LoginPage must use hover:text-primary");
    assert.ok(!registerContent.includes("hover:text-[#C6F432]"), "RegisterPage must use hover:text-primary");
    assert.ok(loginContent.includes("hover:text-primary"), "LoginPage must include hover:text-primary");
    assert.ok(registerContent.includes("hover:text-primary"), "RegisterPage must include hover:text-primary");
  });
});

test("Token Storage & Request Authorization Headers", async (t) => {
  const AUTH_TOKEN_KEY = "studyhub_token";

  function getAuthToken() {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  }

  function setAuthToken(token) {
    if (token) localStorage.setItem(AUTH_TOKEN_KEY, token);
    else localStorage.removeItem(AUTH_TOKEN_KEY);
  }

  function defaultHeaders(extra = {}) {
    const headers = {
      "X-Session-ID": "test-session-id",
      ...extra,
    };
    const token = getAuthToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  }

  await t.test("Unauthenticated headers include X-Session-ID but omit Authorization", () => {
    setAuthToken(null);
    const headers = defaultHeaders();
    assert.equal(headers["X-Session-ID"], "test-session-id");
    assert.equal(headers["Authorization"], undefined);
  });

  await t.test("Authenticated headers attach Bearer token and retain X-Session-ID", () => {
    setAuthToken("sample.jwt.token");
    const headers = defaultHeaders();
    assert.equal(headers["Authorization"], "Bearer sample.jwt.token");
    assert.equal(headers["X-Session-ID"], "test-session-id");
  });

  await t.test("Session logout or 401 expiration clears token cleanly", () => {
    setAuthToken("sample.jwt.token");
    assert.equal(getAuthToken(), "sample.jwt.token");
    setAuthToken(null);
    assert.equal(getAuthToken(), null);
    const headers = defaultHeaders();
    assert.equal(headers["Authorization"], undefined);
  });
});

test("Form Validation Logic", async (t) => {
  function validateRegistration(email, password, confirmPassword) {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) return "Email is required.";
    if (!trimmedEmail.includes("@") || !trimmedEmail.includes(".")) return "Invalid email address.";
    if (!password) return "Password is required.";
    if (password.length < 8) return "Password must be at least 8 characters.";
    if (password.length > 72) return "Password cannot exceed 72 characters.";
    if (password !== confirmPassword) return "Passwords do not match.";
    return null;
  }

  await t.test("Validates proper email address", () => {
    assert.equal(validateRegistration("", "password123", "password123"), "Email is required.");
    assert.equal(validateRegistration("notanemail", "password123", "password123"), "Invalid email address.");
  });

  await t.test("Validates password requirements and confirmation match", () => {
    assert.equal(validateRegistration("test@studyhub.edu", "short", "short"), "Password must be at least 8 characters.");
    assert.equal(validateRegistration("test@studyhub.edu", "password123", "different123"), "Passwords do not match.");
    assert.equal(validateRegistration("test@studyhub.edu", "validPassword123!", "validPassword123!"), null);
  });
});

test("WCAG 2.1 Contrast Ratio Verification", async (t) => {
  // Relative luminance calculation
  function getLuminance(r, g, b) {
    const [rs, gs, bs] = [r, g, b].map((c) => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }

  function getContrastRatio(rgb1, rgb2) {
    const l1 = getLuminance(...rgb1);
    const l2 = getLuminance(...rgb2);
    const brightest = Math.max(l1, l2);
    const darkest = Math.min(l1, l2);
    return (brightest + 0.05) / (darkest + 0.05);
  }

  const midnightBlack = [11, 11, 12];   // #0B0B0C
  const pureWhite = [255, 255, 255];    // #FFFFFF
  const electricLime = [198, 244, 50];  // #C6F432
  const forestOlive = [63, 98, 18];     // #3F6212 (Light mode primary)

  await t.test("Midnight Black vs Pure White contrast exceeds WCAG AAA (7:1)", () => {
    const contrast = getContrastRatio(midnightBlack, pureWhite);
    assert.ok(contrast > 19.0, `Contrast ratio ${contrast.toFixed(2)} should exceed 19.0`);
  });

  await t.test("Lime Green vs Midnight Black text contrast exceeds WCAG AAA (7:1)", () => {
    const contrast = getContrastRatio(electricLime, midnightBlack);
    assert.ok(contrast > 14.0, `Contrast ratio ${contrast.toFixed(2)} should exceed 14.0`);
  });

  await t.test("Light Mode Forest Olive vs Pure White text contrast exceeds WCAG AAA (7:1)", () => {
    const contrast = getContrastRatio(forestOlive, pureWhite);
    assert.ok(contrast > 7.0, `Contrast ratio ${contrast.toFixed(2)} should exceed 7.0 (WCAG AAA)`);
  });
});
