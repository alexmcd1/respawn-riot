// Convert the unit on an already-scaled ingredient line between
// metric and imperial. Returns the line unchanged when:
//   - system is 'as-written' (no conversion)
//   - the line has no recognizable quantity + unit ("Salt to taste")
//   - the unit is already in the target system
//
// We never convert weight ↔ volume (no density data) — only between
// units of the same kind. "3 eggs" passes through untouched.

import { scaleIngredient } from "./scale";

export type System = "as-written" | "metric" | "imperial";

type Kind = "weight" | "volume";

type UnitDef = {
  /** Canonical short label used in output ("g", "oz", "tbsp") */
  label: string;
  system: "metric" | "imperial";
  kind: Kind;
  /** Multiplier to reach the base unit of its kind (grams for weight, ml for volume) */
  toBase: number;
};

// Aliases — lowercased lookup. Order doesn't matter; longest-first
// matching is handled by sorting at runtime.
const UNIT_ALIASES: Record<string, UnitDef> = {
  // ─── Weight, metric
  g: { label: "g", system: "metric", kind: "weight", toBase: 1 },
  gr: { label: "g", system: "metric", kind: "weight", toBase: 1 },
  gram: { label: "g", system: "metric", kind: "weight", toBase: 1 },
  grams: { label: "g", system: "metric", kind: "weight", toBase: 1 },
  kg: { label: "kg", system: "metric", kind: "weight", toBase: 1000 },
  kilo: { label: "kg", system: "metric", kind: "weight", toBase: 1000 },
  kilos: { label: "kg", system: "metric", kind: "weight", toBase: 1000 },
  kilogram: { label: "kg", system: "metric", kind: "weight", toBase: 1000 },
  kilograms: { label: "kg", system: "metric", kind: "weight", toBase: 1000 },

  // ─── Weight, imperial
  oz: { label: "oz", system: "imperial", kind: "weight", toBase: 28.3495 },
  ozs: { label: "oz", system: "imperial", kind: "weight", toBase: 28.3495 },
  ounce: { label: "oz", system: "imperial", kind: "weight", toBase: 28.3495 },
  ounces: { label: "oz", system: "imperial", kind: "weight", toBase: 28.3495 },
  lb: { label: "lb", system: "imperial", kind: "weight", toBase: 453.592 },
  lbs: { label: "lb", system: "imperial", kind: "weight", toBase: 453.592 },
  pound: { label: "lb", system: "imperial", kind: "weight", toBase: 453.592 },
  pounds: { label: "lb", system: "imperial", kind: "weight", toBase: 453.592 },

  // ─── Volume, metric
  ml: { label: "ml", system: "metric", kind: "volume", toBase: 1 },
  milliliter: { label: "ml", system: "metric", kind: "volume", toBase: 1 },
  milliliters: { label: "ml", system: "metric", kind: "volume", toBase: 1 },
  millilitre: { label: "ml", system: "metric", kind: "volume", toBase: 1 },
  millilitres: { label: "ml", system: "metric", kind: "volume", toBase: 1 },
  l: { label: "L", system: "metric", kind: "volume", toBase: 1000 },
  liter: { label: "L", system: "metric", kind: "volume", toBase: 1000 },
  liters: { label: "L", system: "metric", kind: "volume", toBase: 1000 },
  litre: { label: "L", system: "metric", kind: "volume", toBase: 1000 },
  litres: { label: "L", system: "metric", kind: "volume", toBase: 1000 },

  // ─── Volume, imperial (US)
  tsp: { label: "tsp", system: "imperial", kind: "volume", toBase: 4.92892 },
  tsps: { label: "tsp", system: "imperial", kind: "volume", toBase: 4.92892 },
  teaspoon: { label: "tsp", system: "imperial", kind: "volume", toBase: 4.92892 },
  teaspoons: { label: "tsp", system: "imperial", kind: "volume", toBase: 4.92892 },
  tbsp: { label: "tbsp", system: "imperial", kind: "volume", toBase: 14.7868 },
  tbsps: { label: "tbsp", system: "imperial", kind: "volume", toBase: 14.7868 },
  tbs: { label: "tbsp", system: "imperial", kind: "volume", toBase: 14.7868 },
  tablespoon: { label: "tbsp", system: "imperial", kind: "volume", toBase: 14.7868 },
  tablespoons: { label: "tbsp", system: "imperial", kind: "volume", toBase: 14.7868 },
  cup: { label: "cup", system: "imperial", kind: "volume", toBase: 236.588 },
  cups: { label: "cups", system: "imperial", kind: "volume", toBase: 236.588 },
  c: { label: "cup", system: "imperial", kind: "volume", toBase: 236.588 },
  "fl oz": { label: "fl oz", system: "imperial", kind: "volume", toBase: 29.5735 },
  "fl. oz": { label: "fl oz", system: "imperial", kind: "volume", toBase: 29.5735 },
  "fl. oz.": { label: "fl oz", system: "imperial", kind: "volume", toBase: 29.5735 },
  "fluid ounce": { label: "fl oz", system: "imperial", kind: "volume", toBase: 29.5735 },
  "fluid ounces": { label: "fl oz", system: "imperial", kind: "volume", toBase: 29.5735 },
  pt: { label: "pt", system: "imperial", kind: "volume", toBase: 473.176 },
  pint: { label: "pt", system: "imperial", kind: "volume", toBase: 473.176 },
  pints: { label: "pt", system: "imperial", kind: "volume", toBase: 473.176 },
  qt: { label: "qt", system: "imperial", kind: "volume", toBase: 946.353 },
  quart: { label: "qt", system: "imperial", kind: "volume", toBase: 946.353 },
  quarts: { label: "qt", system: "imperial", kind: "volume", toBase: 946.353 },
  gal: { label: "gal", system: "imperial", kind: "volume", toBase: 3785.41 },
  gallon: { label: "gal", system: "imperial", kind: "volume", toBase: 3785.41 },
  gallons: { label: "gal", system: "imperial", kind: "volume", toBase: 3785.41 },
};

// Aliases sorted longest-first so "fl oz" matches before "oz", "fluid ounces"
// before "fluid ounce", etc.
const ALIAS_KEYS = Object.keys(UNIT_ALIASES).sort((a, b) => b.length - a.length);

// Look for a unit word at the very start of `text` (after any whitespace).
// Returns the matched UnitDef + the rest of the line, or null.
function parseLeadingUnit(text: string): { unit: UnitDef; rest: string } | null {
  const lower = text.toLowerCase().trimStart();
  const lostChars = text.length - text.trimStart().length;
  for (const key of ALIAS_KEYS) {
    if (lower.startsWith(key)) {
      // Make sure we matched a whole word (next char is a boundary)
      const next = lower.charAt(key.length);
      if (next === "" || /[\s.,;:)\-]/.test(next)) {
        let restStart = lostChars + key.length;
        // Eat one trailing period (e.g. "oz.")
        if (text.charAt(restStart) === ".") restStart += 1;
        return { unit: UNIT_ALIASES[key], rest: text.slice(restStart).trimStart() };
      }
    }
  }
  return null;
}

// Same number parser used by scale.ts, duplicated locally so this
// module is independent. Returns [numericValue, restAfterNumber] or null.
const UNICODE_FRACTIONS: Record<string, number> = {
  "¼": 0.25, "½": 0.5, "¾": 0.75,
  "⅓": 1 / 3, "⅔": 2 / 3,
  "⅛": 0.125, "⅜": 0.375, "⅝": 0.625, "⅞": 0.875,
  "⅕": 0.2, "⅖": 0.4, "⅗": 0.6, "⅘": 0.8,
  "⅙": 1 / 6, "⅚": 5 / 6,
};

function parseLeadingNumber(text: string): [number, string] | null {
  const trimmed = text.replace(/^\s+/, "");
  const uniMatch = trimmed.match(/^(\d+)?\s*([¼½¾⅓⅔⅛⅜⅝⅞⅕⅖⅗⅘⅙⅚])\s*/);
  if (uniMatch) {
    const whole = uniMatch[1] ? parseInt(uniMatch[1], 10) : 0;
    return [whole + (UNICODE_FRACTIONS[uniMatch[2]] ?? 0), trimmed.slice(uniMatch[0].length)];
  }
  const mixedMatch = trimmed.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)\s*/);
  if (mixedMatch) {
    const whole = parseInt(mixedMatch[1], 10);
    const num = parseInt(mixedMatch[2], 10);
    const den = parseInt(mixedMatch[3], 10);
    if (den > 0) return [whole + num / den, trimmed.slice(mixedMatch[0].length)];
  }
  const fracMatch = trimmed.match(/^(\d+)\s*\/\s*(\d+)\s*/);
  if (fracMatch) {
    const num = parseInt(fracMatch[1], 10);
    const den = parseInt(fracMatch[2], 10);
    if (den > 0) return [num / den, trimmed.slice(fracMatch[0].length)];
  }
  const numMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*/);
  if (numMatch) return [parseFloat(numMatch[1]), trimmed.slice(numMatch[0].length)];
  return null;
}

// Pick the best target unit for a converted base value. Keeps numbers
// in a readable range (no 0.0123 cups or 12000 ml).
function pickTargetUnit(baseValue: number, kind: Kind, system: "metric" | "imperial") {
  if (kind === "weight") {
    if (system === "metric") {
      return baseValue >= 1000
        ? { label: "kg", toBase: 1000 }
        : { label: "g", toBase: 1 };
    }
    // imperial: oz under ~1 lb, lb above
    return baseValue >= 453.592
      ? { label: "lb", toBase: 453.592 }
      : { label: "oz", toBase: 28.3495 };
  }
  // volume
  if (system === "metric") {
    return baseValue >= 1000
      ? { label: "L", toBase: 1000 }
      : { label: "ml", toBase: 1 };
  }
  // imperial volume — go by base ml value (1 cup = 236.588 ml)
  if (baseValue >= 946.353)       return { label: "qt", toBase: 946.353 };   // 1+ qt
  if (baseValue >= 59.147)        return { label: "cup", toBase: 236.588 }; // 1/4+ cup
  if (baseValue >= 12)            return { label: "tbsp", toBase: 14.7868 };
  return { label: "tsp", toBase: 4.92892 };
}

// Format a numeric quantity to a friendly string.
//   - Snap to 1/8ths if close enough (1/4 cup, not 0.25 cup)
//   - Otherwise show up to 1 decimal
//   - Round integer counts to whole numbers
function formatQty(n: number, isMetric: boolean): string {
  if (!isFinite(n) || n <= 0) return "0";

  // Metric grams/ml: prefer whole numbers; round small fractions
  if (isMetric) {
    if (n >= 100) return String(Math.round(n));
    if (n >= 10) return String(Math.round(n));
    if (n >= 1) return n.toFixed(1).replace(/\.0$/, "");
    return n.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  }

  // Imperial: prefer fractions
  const whole = Math.floor(n);
  const frac = n - whole;
  const eighths = Math.round(frac * 8);
  const snapped = eighths / 8;

  const fracStr = (() => {
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

  if (Math.abs(snapped - frac) > 0.012 && frac > 0) {
    return Math.round(n * 100) / 100 + "";
  }
  if (whole === 0) return fracStr || "0";
  if (!fracStr) return String(whole);
  return `${whole} ${fracStr}`;
}

export function convertIngredient(line: string, system: System): string {
  if (system === "as-written" || !line) return line;

  const num = parseLeadingNumber(line);
  if (!num) return line; // no quantity → nothing to convert
  const [qty, afterNum] = num;

  const u = parseLeadingUnit(afterNum);
  if (!u) return line; // no unit → "3 eggs", leave it alone

  if (u.unit.system === system) return line; // already in the target system

  // Convert
  const base = qty * u.unit.toBase;
  const target = pickTargetUnit(base, u.unit.kind, system);
  const newQty = base / target.toBase;
  const isMetric = system === "metric";
  return `${formatQty(newQty, isMetric)} ${target.label} ${u.rest}`.replace(/\s+/g, " ").trim();
}

// Convenience: scale first, then convert. Both transforms are no-ops at
// their identity inputs, so this is safe to always call.
export function transformIngredient(line: string, scale: number, system: System): string {
  return convertIngredient(scaleIngredient(line, scale), system);
}
