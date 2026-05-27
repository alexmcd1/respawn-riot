// Scale an ingredient line by a factor. Handles:
//   - Mixed numbers:    "1 1/2 cups flour"
//   - Pure fractions:   "1/2 tsp salt"
//   - Decimals:         "0.25 lb butter"
//   - Integers:         "3 eggs"
//   - Unicode fractions: "½ cup sugar"
// Leaves lines with no leading quantity untouched ("Pinch of salt").

const UNICODE_FRACTIONS: Record<string, number> = {
  "¼": 0.25,
  "½": 0.5,
  "¾": 0.75,
  "⅓": 1 / 3,
  "⅔": 2 / 3,
  "⅛": 0.125,
  "⅜": 0.375,
  "⅝": 0.625,
  "⅞": 0.875,
  "⅕": 0.2,
  "⅖": 0.4,
  "⅗": 0.6,
  "⅘": 0.8,
  "⅙": 1 / 6,
  "⅚": 5 / 6,
};

// Format a numeric quantity back into a recipe-friendly string.
// Prefers common fractions for readability ("0.5" → "1/2").
function formatQty(n: number): string {
  if (!isFinite(n) || n <= 0) return "0";
  const whole = Math.floor(n);
  const frac = n - whole;

  // Snap to nearest 1/8 if close enough
  const eighths = Math.round(frac * 8);
  const snapped = eighths / 8;
  const fracStr = ((): string => {
    switch (eighths) {
      case 0: return "";
      case 1: return "1/8";
      case 2: return "1/4";
      case 3: return "3/8";
      case 4: return "1/2";
      case 5: return "5/8";
      case 6: return "3/4";
      case 7: return "7/8";
      default: return "";
    }
  })();

  // If our snap to 1/8ths is off by more than 1% of the value, fall
  // back to a decimal — keeps weird quantities accurate.
  if (Math.abs(snapped - frac) > 0.012 && frac > 0) {
    const rounded = Math.round(n * 100) / 100;
    // Trim trailing zeros
    return rounded.toString().replace(/\.?0+$/, "");
  }

  if (whole === 0) return fracStr || "0";
  if (!fracStr) return String(whole);
  return `${whole} ${fracStr}`;
}

// Try to parse a number off the start of `text`.
// Returns [number, rest] or null.
function parseLeadingNumber(text: string): [number, string] | null {
  const trimmed = text.replace(/^\s+/, "");

  // Unicode fraction (optionally preceded by a whole number)
  const uniMatch = trimmed.match(/^(\d+)?\s*([¼½¾⅓⅔⅛⅜⅝⅞⅕⅖⅗⅘⅙⅚])\s*/);
  if (uniMatch) {
    const whole = uniMatch[1] ? parseInt(uniMatch[1], 10) : 0;
    const frac = UNICODE_FRACTIONS[uniMatch[2]] ?? 0;
    return [whole + frac, trimmed.slice(uniMatch[0].length)];
  }

  // Mixed number: "1 1/2"
  const mixedMatch = trimmed.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)\s+/);
  if (mixedMatch) {
    const whole = parseInt(mixedMatch[1], 10);
    const num = parseInt(mixedMatch[2], 10);
    const den = parseInt(mixedMatch[3], 10);
    if (den > 0) {
      return [whole + num / den, trimmed.slice(mixedMatch[0].length)];
    }
  }

  // Pure fraction: "1/2"
  const fracMatch = trimmed.match(/^(\d+)\s*\/\s*(\d+)\s*/);
  if (fracMatch) {
    const num = parseInt(fracMatch[1], 10);
    const den = parseInt(fracMatch[2], 10);
    if (den > 0) {
      return [num / den, trimmed.slice(fracMatch[0].length)];
    }
  }

  // Decimal or integer
  const numMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*/);
  if (numMatch) {
    return [parseFloat(numMatch[1]), trimmed.slice(numMatch[0].length)];
  }

  return null;
}

export function scaleIngredient(line: string, factor: number): string {
  if (factor === 1 || !line) return line;

  // Handle a range ("1-2 cups"): scale both sides.
  const rangeMatch = line.match(/^\s*(\d+(?:\.\d+)?)\s*(?:-|–|—|to)\s*(\d+(?:\.\d+)?)\s+/i);
  if (rangeMatch) {
    const a = parseFloat(rangeMatch[1]) * factor;
    const b = parseFloat(rangeMatch[2]) * factor;
    const rest = line.slice(rangeMatch[0].length);
    return `${formatQty(a)}-${formatQty(b)} ${rest}`;
  }

  const parsed = parseLeadingNumber(line);
  if (!parsed) return line;
  const [n, rest] = parsed;
  return `${formatQty(n * factor)} ${rest}`;
}
