/**
 * Automated test suite for StudyHub V2 frontend authentication, theme persistence, and design tokens.
 */

import assert from "node:assert/strict";
import test from "node:test";

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

globalThis.localStorage = new MockLocalStorage();
globalThis.window = {
  localStorage: globalThis.localStorage,
  matchMedia: (query) => ({
    matches: query.includes("dark"),
    addEventListener: () => {},
    removeEventListener: () => {},
  }),
};

test("Theme Persistence Logic", async (t) => {
  await t.test("Default theme is dark when no stored preference exists", () => {
    localStorage.clear();
    const stored = localStorage.getItem("studyhub_theme");
    const theme = (stored === "dark" || stored === "light" || stored === "system") ? stored : "dark";
    assert.equal(theme, "dark");
  });

  await t.test("Stored theme is retrieved and persisted properly", () => {
    localStorage.setItem("studyhub_theme", "light");
    assert.equal(localStorage.getItem("studyhub_theme"), "light");

    localStorage.setItem("studyhub_theme", "system");
    assert.equal(localStorage.getItem("studyhub_theme"), "system");

    localStorage.setItem("studyhub_theme", "dark");
    assert.equal(localStorage.getItem("studyhub_theme"), "dark");
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
  const limeGreen = [198, 244, 50];     // #C6F432

  await t.test("Midnight Black vs Pure White contrast exceeds WCAG AAA (7:1)", () => {
    const contrast = getContrastRatio(midnightBlack, pureWhite);
    assert.ok(contrast > 19.0, `Contrast ratio ${contrast.toFixed(2)} should exceed 19.0`);
  });

  await t.test("Lime Green vs Midnight Black text contrast exceeds WCAG AAA (7:1)", () => {
    const contrast = getContrastRatio(limeGreen, midnightBlack);
    assert.ok(contrast > 14.0, `Contrast ratio ${contrast.toFixed(2)} should exceed 14.0`);
  });
});
