// localStorage-backed shopping list.
//
// Items are flat — qty + text + optional category. We keep this simple
// on purpose (no per-item editing UI beyond delete + check) because
// shopping happens fast. Add → check → delete is the whole loop.
//
// Cross-component sync follows the same pattern as recipes/ratings:
// writers fire SHOPPING_EVENT on window, listeners re-hydrate.

export const LS_KEY = "respawn.food.shopping.v1";
export const SHOPPING_EVENT = "respawn:shopping-changed";

export type ShoppingCategory =
  | "produce"
  | "meat"
  | "dairy"
  | "pantry"
  | "frozen"
  | "bakery"
  | "drinks"
  | "other";

export type ShoppingItem = {
  id: string;
  text: string;             // "milk", "ground beef", "olive oil"
  qty?: string;             // optional — "2 lbs", "1 gal"
  category?: ShoppingCategory;
  checked: boolean;
  addedAt: number;          // epoch ms
};

export const CATEGORY_META: Record<
  ShoppingCategory,
  { label: string; emoji: string; chip: string }
> = {
  produce: { label: "Produce", emoji: "🥬", chip: "bg-emerald-500/15 text-emerald-200 border-emerald-400/40" },
  meat:    { label: "Meat",    emoji: "🥩", chip: "bg-red-500/15 text-red-200 border-red-400/40" },
  dairy:   { label: "Dairy",   emoji: "🥛", chip: "bg-sky-500/15 text-sky-200 border-sky-400/40" },
  pantry:  { label: "Pantry",  emoji: "🧂", chip: "bg-amber-500/15 text-amber-200 border-amber-400/40" },
  frozen:  { label: "Frozen",  emoji: "🧊", chip: "bg-cyan-500/15 text-cyan-200 border-cyan-400/40" },
  bakery:  { label: "Bakery",  emoji: "🥐", chip: "bg-orange-500/15 text-orange-200 border-orange-400/40" },
  drinks:  { label: "Drinks",  emoji: "🥤", chip: "bg-violet-500/15 text-violet-200 border-violet-400/40" },
  other:   { label: "Other",   emoji: "📦", chip: "bg-white/10 text-white/70 border-white/20" },
};

export const CATEGORY_ORDER: ShoppingCategory[] = [
  "produce", "meat", "dairy", "bakery", "pantry", "frozen", "drinks", "other",
];

// Light heuristic — keywords that suggest a category. Used by
// "import from recipe" to pre-bucket items. Far from perfect; the user
// can always change the category by deleting + re-adding.
const CATEGORY_HINTS: Array<[ShoppingCategory, RegExp]> = [
  ["produce", /\b(apple|onion|garlic|tomato|potato|lettuce|spinach|kale|carrot|celery|pepper|cucumber|broccoli|cauliflower|mushroom|lemon|lime|orange|banana|berry|berries|herb|parsley|cilantro|basil|mint|ginger|avocado|corn|bean|peas?|zucchini|squash|asparagus|cabbage|leek|scallion)/i],
  ["meat",    /\b(chicken|beef|pork|bacon|sausage|ham|turkey|lamb|steak|ground|shrimp|fish|salmon|tuna|cod|tilapia|crab|lobster|venison)/i],
  ["dairy",   /\b(milk|cream|butter|cheese|yogurt|sour cream|cottage cheese|cream cheese|ricotta|mozzarella|cheddar|parmesan|feta|egg|eggs)/i],
  ["bakery",  /\b(bread|bun|bagel|tortilla|pita|croissant|roll|baguette|cake|cookie|donut|doughnut|muffin|pie|pastry)/i],
  ["pantry",  /\b(flour|sugar|salt|pepper|oil|vinegar|sauce|paste|stock|broth|rice|pasta|noodle|cereal|oats|beans?|lentil|spice|cumin|paprika|cinnamon|honey|syrup|chip)/i],
  ["frozen",  /\b(frozen|ice cream|popsicle|peas)/i],
  ["drinks",  /\b(soda|juice|water|beer|wine|coffee|tea|cola|sprite|milk)/i],
];

export function guessCategory(text: string): ShoppingCategory | undefined {
  for (const [cat, re] of CATEGORY_HINTS) if (re.test(text)) return cat;
  return undefined;
}

function fireChange() {
  if (typeof window === "undefined") return;
  try { window.dispatchEvent(new CustomEvent(SHOPPING_EVENT)); } catch {}
}

export function loadShopping(): ShoppingItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as ShoppingItem[]).filter((i) => i && typeof i.text === "string");
  } catch {
    return [];
  }
}

function persist(items: ShoppingItem[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(items));
    fireChange();
  } catch {
    // quota or disabled — silently fail
  }
}

function newId(): string {
  return `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function addItem(
  text: string,
  opts?: { qty?: string; category?: ShoppingCategory }
): ShoppingItem | null {
  const clean = text.trim();
  if (!clean) return null;
  const item: ShoppingItem = {
    id: newId(),
    text: clean,
    qty: opts?.qty?.trim() || undefined,
    category: opts?.category ?? guessCategory(clean),
    checked: false,
    addedAt: Date.now(),
  };
  persist([item, ...loadShopping()]);
  return item;
}

// Add many items at once (used by "import from saved recipe"). Skips
// duplicates that case-insensitively match an existing UNCHECKED item.
export function addManyItems(
  inputs: Array<{ text: string; qty?: string; category?: ShoppingCategory }>
): number {
  if (inputs.length === 0) return 0;
  const current = loadShopping();
  const liveTexts = new Set(
    current.filter((i) => !i.checked).map((i) => i.text.trim().toLowerCase())
  );
  const fresh: ShoppingItem[] = [];
  for (const input of inputs) {
    const clean = input.text.trim();
    if (!clean) continue;
    if (liveTexts.has(clean.toLowerCase())) continue;
    fresh.push({
      id: newId(),
      text: clean,
      qty: input.qty?.trim() || undefined,
      category: input.category ?? guessCategory(clean),
      checked: false,
      addedAt: Date.now(),
    });
    liveTexts.add(clean.toLowerCase());
  }
  if (fresh.length === 0) return 0;
  persist([...fresh, ...current]);
  return fresh.length;
}

export function toggleChecked(id: string) {
  const next = loadShopping().map((i) =>
    i.id === id ? { ...i, checked: !i.checked } : i
  );
  persist(next);
}

export function setCategory(id: string, category: ShoppingCategory | undefined) {
  const next = loadShopping().map((i) =>
    i.id === id ? { ...i, category } : i
  );
  persist(next);
}

export function removeItem(id: string) {
  persist(loadShopping().filter((i) => i.id !== id));
}

export function clearChecked() {
  persist(loadShopping().filter((i) => !i.checked));
}

export function clearAll() {
  persist([]);
}

// Convert a recipe ingredient line ("2 cups flour", "1 lb ground beef")
// into a {qty, text} split. Greedy match for a leading qty (number +
// optional unit word). Leaves text untouched if no obvious qty.
export function splitQty(line: string): { qty?: string; text: string } {
  const trimmed = line.trim();
  // Match "1", "1/2", "1.5", "1 1/2" optionally followed by a single
  // unit word (cups, tbsp, lbs, etc).
  const m = trimmed.match(
    /^([\d¼½¾⅓⅔⅛⅜⅝⅞]+(?:[\s./]\d+)?(?:\s*(?:cups?|cup|c|tbsp|tablespoons?|tsp|teaspoons?|oz|ounces?|lb|lbs|pounds?|g|grams?|kg|kilograms?|ml|milliliters?|l|liters?|pinch|dash|cloves?|cans?|jars?|sticks?|slices?|sprigs?|leaves?|heads?|stalks?))?)\s+(.+)$/i
  );
  if (!m) return { text: trimmed };
  return { qty: m[1].trim(), text: m[2].trim() };
}

// Format an item for plain-text export ("Copy to clipboard")
export function formatItemLine(item: ShoppingItem): string {
  const prefix = item.checked ? "[x]" : "[ ]";
  const qty = item.qty ? `${item.qty} ` : "";
  return `${prefix} ${qty}${item.text}`;
}
