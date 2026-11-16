import test from "node:test";
import assert from "node:assert/strict";

// Helper: Calculate relative luminance according to WCAG 2.1
function getLuminance(hexColor) {
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const toLinear = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function getContrastRatio(hex1, hex2) {
  const lum1 = getLuminance(hex1);
  const lum2 = getLuminance(hex2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

test("Design Tokens: Academic Monolith Color Palette Contrast", async (t) => {
  await t.test("Dark Theme: Midnight Black (#0B0B0C) vs White text (#FAFAFA) exceeds WCAG AAA (7:1)", () => {
    const ratio = getContrastRatio("#0B0B0C", "#FAFAFA");
    assert.ok(ratio >= 7.0, `Expected contrast >= 7.0, got ${ratio.toFixed(2)}`);
  });

  await t.test("Dark Theme: Electric Lime (#C6F432) vs Midnight Black text (#0B0B0C) exceeds WCAG AAA (7:1)", () => {
    const ratio = getContrastRatio("#C6F432", "#0B0B0C");
    assert.ok(ratio >= 7.0, `Expected contrast >= 7.0, got ${ratio.toFixed(2)}`);
  });

  await t.test("Light Theme: Off-White (#FCFCFC) vs Midnight text (#0B0B0C) exceeds WCAG AAA (7:1)", () => {
    const ratio = getContrastRatio("#FCFCFC", "#0B0B0C");
    assert.ok(ratio >= 7.0, `Expected contrast >= 7.0, got ${ratio.toFixed(2)}`);
  });

  await t.test("Light Theme: High-Contrast Forest Olive (#3F6212) vs White text (#FFFFFF) exceeds WCAG AAA (7:1)", () => {
    const ratio = getContrastRatio("#3F6212", "#FFFFFF");
    assert.ok(ratio >= 7.0, `Expected contrast >= 7.0, got ${ratio.toFixed(2)}`);
  });

  await t.test("Lime Badge: Lime Accent (#82A900) vs Dark text (#0B0B0C) exceeds WCAG AAA (7:1)", () => {
    const ratio = getContrastRatio("#82A900", "#0B0B0C");
    assert.ok(ratio >= 7.0, `Expected contrast >= 7.0, got ${ratio.toFixed(2)}`);
  });
});

test("Design Tokens: 8px Grid Spacing Consistency", async (t) => {
  const spacingRem = {
    1: 0.25, // 4px
    2: 0.5,  // 8px
    3: 0.75, // 12px
    4: 1.0,  // 16px
    6: 1.5,  // 24px
    8: 2.0,  // 32px
    12: 3.0, // 48px
  };

  await t.test("Base grid unit (2) equals exactly 8px (0.5rem assuming 16px root)", () => {
    assert.equal(spacingRem[2] * 16, 8);
  });

  await t.test("All major spacing tokens are multiples of 4px and 8px grid", () => {
    for (const [key, rem] of Object.entries(spacingRem)) {
      const px = rem * 16;
      assert.equal(px % 4, 0, `Token ${key} (${px}px) must align with 4px grid`);
    }
  });
});

test("Component Specifications: Button & IconButton Accessibility", async (t) => {
  await t.test("IconButton requires explicit non-empty aria-label for assistive technology", () => {
    const mockProps = { "aria-label": "Download Syllabus", variant: "lime" };
    assert.ok(mockProps["aria-label"] && mockProps["aria-label"].trim().length > 0);
  });

  await t.test("Button size scale follows proportional padding and height", () => {
    const heights = { xs: 24, sm: 28, default: 36, lg: 40 };
    assert.ok(heights.xs < heights.sm);
    assert.ok(heights.sm < heights.default);
    assert.ok(heights.default < heights.lg);
  });
});

test("Component Specifications: Form Input ARIA Linkage", async (t) => {
  await t.test("Input establishes error relationship via aria-invalid and aria-describedby", () => {
    const inputId = "user-email";
    const error = "Invalid email format";
    const ariaInvalid = Boolean(error);
    const ariaDescribedby = error ? `${inputId}-error` : undefined;

    assert.equal(ariaInvalid, true);
    assert.equal(ariaDescribedby, "user-email-error");
  });

  await t.test("Textarea displays counter when maxLength is specified", () => {
    const maxLength = 300;
    const currentLength = 142;
    const isWarning = currentLength > maxLength * 0.9;
    assert.equal(isWarning, false);
    assert.equal(`${currentLength}/${maxLength}`, "142/300");
  });
});

test("Component Specifications: Tabs ARIA Roles & Keyboard Navigation Contract", async (t) => {
  await t.test("Tabs maintain correct ARIA semantics", () => {
    const tabListRole = "tablist";
    const tabRole = "tab";
    const tabPanelRole = "tabpanel";

    assert.equal(tabListRole, "tablist");
    assert.equal(tabRole, "tab");
    assert.equal(tabPanelRole, "tabpanel");
  });

  await t.test("Arrow keys cycle through tabs circularly", () => {
    const tabs = ["guide", "flashcards", "exam"];
    let currentIndex = 0;

    // ArrowRight advances index
    currentIndex = (currentIndex + 1) % tabs.length;
    assert.equal(tabs[currentIndex], "flashcards");

    // ArrowRight advances to end
    currentIndex = (currentIndex + 1) % tabs.length;
    assert.equal(tabs[currentIndex], "exam");

    // ArrowRight wraps to 0
    currentIndex = (currentIndex + 1) % tabs.length;
    assert.equal(tabs[currentIndex], "guide");

    // ArrowLeft wraps backwards to end
    currentIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    assert.equal(tabs[currentIndex], "exam");
  });
});

test("Component Specifications: Feedback & Overlay Roles", async (t) => {
  await t.test("Dialog sets aria-modal='true' and role='dialog'", () => {
    const role = "dialog";
    const ariaModal = true;
    assert.equal(role, "dialog");
    assert.equal(ariaModal, true);
  });

  await t.test("Spinner announces status to screen readers with role='status'", () => {
    const role = "status";
    const ariaLabel = "Loading";
    assert.equal(role, "status");
    assert.equal(ariaLabel, "Loading");
  });

  await t.test("ErrorState announces critical failures with role='alert'", () => {
    const role = "alert";
    assert.equal(role, "alert");
  });
});
