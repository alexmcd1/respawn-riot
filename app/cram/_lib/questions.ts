// Math flashcard question generators + concept questions.
//
// Ported verbatim from the original public/games/math.html — the
// generator math is unchanged, just wrapped in proper TypeScript
// types. Each generator returns one fresh question; the pool is
// built by calling each many times and deduping by (grade, q, data).
//
// All generators are pure: same seed/inputs → same output, no
// side effects, no DOM.

export type Question = {
  grade: 5 | 6 | 7 | 8;
  topic: string;
  q: string;
  /** Optional pre-formatted data block (stem-and-leaf, sets, etc). */
  data?: string;
  type: "numeric" | "mc";
  /** Numeric answer when type==="numeric". */
  answer?: number;
  /** Tolerance for floating-point comparison. */
  tolerance?: number;
  /** Whether this expects a fraction answer (changes the input hint). */
  isFraction?: boolean;
  /** Pretty-printed fraction form for the feedback. */
  correctFrac?: string;
  /** Choices when type==="mc". */
  options?: string[];
  /** Correct option when type==="mc". */
  correct?: string;
  /** Arithmetic expression used for "Stack on Paper" workspace seed. */
  expr?: string;
  /** Hint text shown after answering. */
  tip: string;
};

// ─── Utils ──────────────────────────────────────────────────────────

const rand = (a: number, b: number) =>
  Math.floor(Math.random() * (b - a + 1)) + a;
const randFloat = (a: number, b: number, dp: number) =>
  +(Math.random() * (b - a) + a).toFixed(dp);
function shuffle<T>(a: T[]): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const pick = <T>(a: T[]): T => a[Math.floor(Math.random() * a.length)];
const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
const simplifyFrac = (n: number, d: number): [number, number] => {
  const g = gcd(Math.abs(n), Math.abs(d));
  return [n / g, d / g];
};
const round = (n: number, dp = 2) => +n.toFixed(dp);

export { shuffle };

// ─── Grade 5 ────────────────────────────────────────────────────────

function g5_decAdd(): Question {
  const a = randFloat(1, 50, pick([1, 2]));
  const b = randFloat(1, 50, pick([1, 2]));
  return {
    grade: 5, topic: "Decimal +",
    q: `Add: ${a} + ${b}`, expr: `${a} + ${b}`,
    type: "numeric", answer: round(a + b, 2), tolerance: 0.01,
    tip: `Stack vertically and LINE UP THE DECIMAL POINTS. Add zeros so both have same decimal places, then add. Answer: ${round(a + b, 2)}.`,
  };
}
function g5_decSub(): Question {
  let a = randFloat(20, 99, pick([1, 2]));
  let b = randFloat(1, 19, pick([1, 2]));
  if (b > a) [a, b] = [b, a];
  return {
    grade: 5, topic: "Decimal −",
    q: `Subtract: ${a} − ${b}`, expr: `${a} - ${b}`,
    type: "numeric", answer: round(a - b, 2), tolerance: 0.01,
    tip: `Stack and line up decimals. Borrow when needed. Answer: ${round(a - b, 2)}.`,
  };
}
function g5_intMul(): Question {
  const a = rand(10, 99); const b = rand(2, 9);
  return {
    grade: 5, topic: "Whole # ×",
    q: `Multiply: ${a} × ${b}`, expr: `${a} * ${b}`,
    type: "numeric", answer: a * b,
    tip: `Multiply each digit of ${a} by ${b}, carrying over when the result is 10 or more.`,
  };
}
function g5_intDiv(): Question {
  const b = rand(2, 9); const q = rand(11, 99); const a = b * q;
  return {
    grade: 5, topic: "Whole # ÷",
    q: `Divide: ${a} ÷ ${b}`, expr: `${a} / ${b}`,
    type: "numeric", answer: q,
    tip: `Use long division. How many ${b}s fit in the leftmost digits of ${a}? Bring down the next digit. Answer: ${q}.`,
  };
}
function g5_fracAddLikeDen(): Question {
  const d = pick([3, 4, 5, 6, 8, 10]);
  const n1 = rand(1, d - 1); const n2 = rand(1, d - 1);
  const [sn, sd] = simplifyFrac(n1 + n2, d);
  return {
    grade: 5, topic: "Fraction +",
    q: `Add: ${n1}/${d} + ${n2}/${d}`,
    type: "numeric", answer: sn / sd, tolerance: 0.001,
    isFraction: true, correctFrac: `${sn}/${sd}`,
    tip: `Same denominator! Just add numerators: ${n1}+${n2}=${n1 + n2}. Result: ${n1 + n2}/${d} = ${sn}/${sd}.`,
  };
}
function g5_orderOps(): Question {
  const a = rand(2, 9); const b = rand(2, 9); const c = rand(2, 9);
  const op1 = pick(["+", "−"]);
  const ans = a + (op1 === "+" ? b * c : -b * c);
  return {
    grade: 5, topic: "Order of Ops",
    q: `Solve using PEMDAS: ${a} ${op1} ${b} × ${c}`,
    type: "numeric", answer: ans,
    tip: `PEMDAS: do × before + or −. ${b}×${c}=${b * c}, then ${a} ${op1} ${b * c} = ${ans}.`,
  };
}
function g5_rectArea(): Question {
  const l = rand(3, 20); const w = rand(3, 20);
  return {
    grade: 5, topic: "Area",
    q: `Find the AREA of a rectangle with length ${l} and width ${w}.`,
    type: "numeric", answer: l * w,
    tip: `Area of rectangle = length × width = ${l} × ${w} = ${l * w}.`,
  };
}
function g5_volume(): Question {
  const l = rand(2, 10); const w = rand(2, 10); const h = rand(2, 10);
  return {
    grade: 5, topic: "Volume",
    q: `Find the VOLUME of a rectangular prism with length ${l}, width ${w}, and height ${h}.`,
    type: "numeric", answer: l * w * h,
    tip: `Volume = l × w × h = ${l} × ${w} × ${h} = ${l * w * h}.`,
  };
}
function g5_triArea(): Question {
  const b = rand(4, 20) * 2; const h = rand(3, 15);
  const ans = (b * h) / 2;
  return {
    grade: 5, topic: "Area",
    q: `Find the AREA of a triangle with base ${b} and height ${h}.`,
    type: "numeric", answer: ans,
    tip: `Area of triangle = (base × height) ÷ 2 = (${b} × ${h}) ÷ 2 = ${b * h} ÷ 2 = ${ans}.`,
  };
}
function g5_placeValue(): Question {
  const digits = ["one", "ten", "hundred", "thousand"];
  const idx = rand(0, 3);
  const num = rand(1000, 9999);
  const ans = Math.floor(num / Math.pow(10, idx)) % 10;
  return {
    grade: 5, topic: "Place Value",
    q: `In the number ${num}, what digit is in the ${digits[idx]}s place?`,
    type: "numeric", answer: ans,
    tip: `Read the number right-to-left: ones, tens, hundreds, thousands. The digit in the ${digits[idx]}s place of ${num} is ${ans}.`,
  };
}

// ─── Grade 6 ────────────────────────────────────────────────────────

function g6_ratio(): Question {
  const a = rand(2, 9); const b = rand(2, 9); const mult = rand(2, 10);
  return {
    grade: 6, topic: "Ratios",
    q: `A class has ${a * mult} boys and ${b * mult} girls. Simplify the ratio of boys to girls.`,
    type: "mc",
    options: [`${a}:${b}`, `${a * mult}:${b * mult}`, `${b}:${a}`, `${a + b}:${mult}`],
    correct: `${a}:${b}`,
    tip: `Divide both numbers by their GCD. ${a * mult}:${b * mult} simplifies to ${a}:${b}.`,
  };
}
function g6_percentOf(): Question {
  const pct = pick([10, 20, 25, 50, 75, 5, 15, 40]);
  const num = rand(2, 20) * 10;
  const ans = (num * pct) / 100;
  return {
    grade: 6, topic: "Percent",
    q: `What is ${pct}% of ${num}?`,
    type: "numeric", answer: ans,
    tip: `% of a number = (% ÷ 100) × number = ${pct / 100} × ${num} = ${ans}. Quick trick: 10% of ${num} = ${num / 10}.`,
  };
}
function g6_findWhole(): Question {
  const pct = pick([10, 20, 25, 50, 75]);
  const part = rand(2, 10) * 5;
  const whole = part / (pct / 100);
  return {
    grade: 6, topic: "Percent",
    q: `${part} is ${pct}% of what number?`,
    type: "numeric", answer: whole,
    tip: `Whole = part ÷ (% ÷ 100) = ${part} ÷ ${pct / 100} = ${whole}.`,
  };
}
function g6_integers(): Question {
  const a = rand(-30, 30); const b = rand(-30, 30);
  const op = pick(["+", "−"]);
  const ans = op === "+" ? a + b : a - b;
  return {
    grade: 6, topic: "Integers ±",
    q: `Evaluate: ${a} ${op} ${b}`,
    expr: `${a} ${op === "−" ? "-" : "+"} ${b}`,
    type: "numeric", answer: ans,
    tip: `${op === "−" ? "Subtracting a negative becomes adding. " : ""}Same signs add; different signs subtract and take the bigger absolute-value sign. Answer: ${ans}.`,
  };
}
function g6_absVal(): Question {
  const n = rand(-50, 50);
  return {
    grade: 6, topic: "Abs Value",
    q: `What is |${n}|?`,
    type: "numeric", answer: Math.abs(n),
    tip: `Absolute value = distance from zero. Always non-negative. |${n}| = ${Math.abs(n)}.`,
  };
}
function g6_evalExpr(): Question {
  const a = rand(2, 9); const b = rand(2, 15); const c = rand(2, 20);
  return {
    grade: 6, topic: "Expressions",
    q: `Evaluate ${a}x + ${b} when x = ${c}`,
    type: "numeric", answer: a * c + b,
    tip: `Substitute x=${c}: ${a}(${c}) + ${b} = ${a * c} + ${b} = ${a * c + b}.`,
  };
}
function g6_meanMedian(): Question {
  const data: number[] = [];
  for (let i = 0; i < 5; i++) data.push(rand(5, 30));
  const which = pick(["mean", "median"]);
  const sorted = [...data].sort((a, b) => a - b);
  const sum = data.reduce((s, x) => s + x, 0);
  const ans = which === "mean" ? sum / data.length : sorted[2];
  return {
    grade: 6, topic: "Statistics",
    q: `Find the ${which.toUpperCase()} of: {${data.join(", ")}}`,
    data: `{${data.join(", ")}}`,
    type: "numeric", answer: ans, tolerance: 0.01,
    tip: which === "mean"
      ? `Mean = sum ÷ count = ${sum} ÷ ${data.length} = ${ans}.`
      : `Sort the data: {${sorted.join(", ")}}. Median = middle value = ${sorted[2]}.`,
  };
}
function g6_fracDivKCF(): Question {
  const d1 = pick([2, 3, 4, 5, 6]); const d2 = pick([2, 3, 4, 5, 6]);
  const n1 = rand(1, d1 - 1); const n2 = rand(1, d2 - 1);
  const [sn, sd] = simplifyFrac(n1 * d2, d1 * n2);
  return {
    grade: 6, topic: "Fraction ÷",
    q: `Divide: ${n1}/${d1} ÷ ${n2}/${d2}`,
    type: "numeric", answer: sn / sd, tolerance: 0.001,
    isFraction: true, correctFrac: `${sn}/${sd}`,
    tip: `Keep, Change, Flip! ${n1}/${d1} × ${d2}/${n2} = ${n1 * d2}/${d1 * n2} = ${sn}/${sd}.`,
  };
}
function g6_trapezoid(): Question {
  const b1 = rand(4, 16); const b2 = rand(4, 16); const h = rand(3, 12) * 2;
  const ans = ((b1 + b2) * h) / 2;
  return {
    grade: 6, topic: "Area",
    q: `Find the AREA of a trapezoid with bases ${b1} and ${b2} and height ${h}.`,
    type: "numeric", answer: ans,
    tip: `Area = ½(b₁ + b₂)(h) = ½(${b1}+${b2})(${h}) = ½(${b1 + b2})(${h}) = ${ans}.`,
  };
}

// ─── Grade 7 (FL state exam focus) ──────────────────────────────────

function sortedSet(size: number, lo = 1, hi = 50): number[] {
  const set = new Set<number>();
  while (set.size < size) set.add(rand(lo, hi));
  return [...set].sort((a, b) => a - b);
}
function fiveNum(d: number[]) {
  const n = d.length;
  const med = n % 2 ? d[(n - 1) / 2] : (d[n / 2 - 1] + d[n / 2]) / 2;
  const lower = d.slice(0, Math.floor(n / 2));
  const upper = d.slice(Math.ceil(n / 2));
  const m = (a: number[]) =>
    a.length % 2 ? a[(a.length - 1) / 2] : (a[a.length / 2 - 1] + a[a.length / 2]) / 2;
  return {
    min: d[0], q1: m(lower), median: med, q3: m(upper), max: d[n - 1],
    iqr: m(upper) - m(lower),
  };
}
function g7_boxMedian(): Question {
  const d = shuffle(sortedSet(rand(5, 9)));
  const sorted = [...d].sort((a, b) => a - b);
  const f = fiveNum(sorted);
  return {
    grade: 7, topic: "Box & Whisker",
    q: `Find the MEDIAN of:`, data: `{${d.join(", ")}}`,
    type: "numeric", answer: f.median,
    tip: `Sort: {${sorted.join(", ")}}. Median = middle value = ${f.median}.`,
  };
}
function g7_boxQ1Q3(): Question {
  const which = pick(["Q1", "Q3"]);
  const d = shuffle(sortedSet(rand(7, 11)));
  const sorted = [...d].sort((a, b) => a - b);
  const f = fiveNum(sorted);
  return {
    grade: 7, topic: "Box & Whisker",
    q: `Find the ${which === "Q1" ? "LOWER QUARTILE (Q1)" : "UPPER QUARTILE (Q3)"} of:`,
    data: `{${d.join(", ")}}`,
    type: "numeric", answer: which === "Q1" ? f.q1 : f.q3,
    tip: `Sort: {${sorted.join(", ")}}. Median=${f.median}. ${which === "Q1" ? "Lower" : "Upper"} half is below/above the median. Q${which === "Q1" ? "1" : "3"} = median of that half = ${which === "Q1" ? f.q1 : f.q3}.`,
  };
}
function g7_boxIQR(): Question {
  const d = shuffle(sortedSet(rand(6, 10)));
  const sorted = [...d].sort((a, b) => a - b);
  const f = fiveNum(sorted);
  return {
    grade: 7, topic: "Box & Whisker",
    q: `Find the IQR (Interquartile Range) of:`, data: `{${d.join(", ")}}`,
    type: "numeric", answer: f.iqr,
    tip: `Sorted: {${sorted.join(", ")}}. Q1=${f.q1}, Q3=${f.q3}. IQR = Q3 − Q1 = ${f.iqr}.`,
  };
}
function g7_circumR(): Question {
  const r = rand(2, 25); const C = round(2 * 3.14 * r, 2);
  return {
    grade: 7, topic: "Circumference",
    q: `Find the CIRCUMFERENCE of a circle with radius ${r}. (π ≈ 3.14)`,
    type: "numeric", answer: C, tolerance: 0.05,
    tip: `C = 2πr = 2 × 3.14 × ${r} = ${C}.`,
  };
}
function g7_circumD(): Question {
  const d = rand(2, 30); const C = round(3.14 * d, 2);
  return {
    grade: 7, topic: "Circumference",
    q: `Find the CIRCUMFERENCE of a circle with diameter ${d}. (π ≈ 3.14)`,
    type: "numeric", answer: C, tolerance: 0.05,
    tip: `C = πd = 3.14 × ${d} = ${C}.`,
  };
}
function g7_circleArea(): Question {
  const r = rand(2, 20); const A = round(3.14 * r * r, 2);
  return {
    grade: 7, topic: "Circle Area",
    q: `Find the AREA of a circle with radius ${r}. (π ≈ 3.14)`,
    type: "numeric", answer: A, tolerance: 0.05,
    tip: `A = πr² = 3.14 × ${r}² = 3.14 × ${r * r} = ${A}. AREA uses radius SQUARED.`,
  };
}
function g7_radiusFromC(): Question {
  const r = rand(2, 20); const C = round(2 * 3.14 * r, 2);
  return {
    grade: 7, topic: "Circumference",
    q: `A circle has circumference ${C}. Find the RADIUS. (π ≈ 3.14)`,
    type: "numeric", answer: r, tolerance: 0.05,
    tip: `r = C ÷ (2π) = ${C} ÷ 6.28 ≈ ${r}.`,
  };
}
function g7_circDiamFromR(): Question {
  const r = rand(2, 30);
  return {
    grade: 7, topic: "Circle Parts",
    q: `If radius = ${r}, what is the diameter?`,
    type: "numeric", answer: r * 2, tip: `d = 2r = ${r * 2}.`,
  };
}
function g7_circRadiusFromD(): Question {
  const d = rand(2, 50) * 2;
  return {
    grade: 7, topic: "Circle Parts",
    q: `If diameter = ${d}, what is the radius?`,
    type: "numeric", answer: d / 2, tip: `r = d ÷ 2 = ${d / 2}.`,
  };
}
function makeStemLeaf(values: number[]): string {
  const g: Record<number, number[]> = {};
  values.forEach((v) => {
    const s = Math.floor(v / 10); const l = v % 10;
    (g[s] = g[s] || []).push(l);
  });
  Object.keys(g).forEach((k) => g[Number(k)].sort((a, b) => a - b));
  const stems = Object.keys(g).map(Number).sort((a, b) => a - b);
  return stems.map((s) => `${s} | ${g[s].join(" ")}`).join("\n");
}
function g7_stemRead(): Question {
  const stem = rand(1, 9); const ct = rand(2, 4); const leaves: number[] = [];
  while (leaves.length < ct) leaves.push(rand(0, 9));
  leaves.sort((a, b) => a - b);
  const nums = leaves.map((l) => stem * 10 + l);
  return {
    grade: 7, topic: "Stem & Leaf",
    q: `What numbers does "${stem} | ${leaves.join(" ")}" represent?`,
    type: "mc",
    options: shuffle([
      nums.join(", "),
      leaves.map((l) => stem + "." + l).join(", "),
      `${stem}, ${leaves.join(", ")}`,
      nums.map((n) => n + 1).join(", "),
    ]),
    correct: nums.join(", "),
    tip: `Stem ${stem} + leaves ${leaves.join(", ")} → ${nums.join(", ")}.`,
  };
}
function g7_stemCount(): Question {
  const vals: number[] = [];
  for (let i = 0; i < rand(8, 14); i++) vals.push(rand(10, 79));
  return {
    grade: 7, topic: "Stem & Leaf",
    q: `How many data points are shown?`, data: makeStemLeaf(vals),
    type: "numeric", answer: vals.length,
    tip: `Count every leaf — each leaf = one data point. Total = ${vals.length}.`,
  };
}
function g7_percentChange(): Question {
  const original = rand(20, 100);
  const newVal = original + (Math.random() < 0.5 ? 1 : -1) * rand(5, original - 1);
  const pct = round(((newVal - original) / original) * 100, 1);
  const word = pct > 0 ? "INCREASE" : "DECREASE";
  return {
    grade: 7, topic: "% Change",
    q: `A price changed from $${original} to $${newVal}. What is the percent ${word.toLowerCase()}? (Round to nearest tenth)`,
    type: "numeric", answer: Math.abs(pct), tolerance: 0.2,
    tip: `% change = (new − old) ÷ old × 100. = (${newVal}−${original}) ÷ ${original} × 100 = ${pct}%. Always use the original as the bottom.`,
  };
}
function g7_discount(): Question {
  const price = rand(20, 200); const pct = pick([10, 15, 20, 25, 30, 40, 50]);
  const ans = round(price * (1 - pct / 100), 2);
  return {
    grade: 7, topic: "Discount/Tax",
    q: `A $${price} item is on sale for ${pct}% off. What is the sale price?`,
    type: "numeric", answer: ans, tolerance: 0.01,
    tip: `Sale price = original × (1 − %) = ${price} × ${1 - pct / 100} = ${ans}. Or: discount = ${(price * pct) / 100}; ${price} − ${(price * pct) / 100} = ${ans}.`,
  };
}
function g7_tax(): Question {
  const price = rand(10, 100); const pct = pick([5, 6, 7, 8, 8.25]);
  const tax = round((price * pct) / 100, 2); const total = round(price + tax, 2);
  return {
    grade: 7, topic: "Discount/Tax",
    q: `A $${price} item has ${pct}% sales tax. What is the total cost?`,
    type: "numeric", answer: total, tolerance: 0.02,
    tip: `Tax = price × ${pct / 100} = ${tax}. Total = ${price} + ${tax} = ${total}.`,
  };
}
function g7_twoStep(): Question {
  const x = rand(2, 12); const a = rand(2, 9); const b = rand(2, 20);
  const result = a * x + b;
  return {
    grade: 7, topic: "Equations",
    q: `Solve for x:  ${a}x + ${b} = ${result}`,
    type: "numeric", answer: x,
    tip: `Subtract ${b} from both sides: ${a}x = ${result - b}. Divide by ${a}: x = ${x}.`,
  };
}
function g7_proportion(): Question {
  const a = rand(2, 9); const b = rand(2, 9); const k = rand(2, 10);
  return {
    grade: 7, topic: "Proportions",
    q: `If ${a}/${b} = x/${b * k}, find x.`,
    type: "numeric", answer: a * k,
    tip: `Cross-multiply or scale: multiply both sides by ${b * k}. x = ${a} × ${k} = ${a * k}.`,
  };
}
function g7_decAdd(): Question {
  const a = randFloat(1, 99, pick([1, 2])); const b = randFloat(1, 99, pick([1, 2]));
  return {
    grade: 7, topic: "Decimal +",
    q: `Add: ${a} + ${b}`, expr: `${a} + ${b}`,
    type: "numeric", answer: round(a + b, 2), tolerance: 0.01,
    tip: `Stack, line up decimals, add zeros so columns match, add. Answer: ${round(a + b, 2)}.`,
  };
}
function g7_decSub(): Question {
  let a = randFloat(20, 99, pick([1, 2]));
  let b = randFloat(1, 19, pick([1, 2]));
  if (b > a) [a, b] = [b, a];
  return {
    grade: 7, topic: "Decimal −",
    q: `Subtract: ${a} − ${b}`, expr: `${a} - ${b}`,
    type: "numeric", answer: round(a - b, 2), tolerance: 0.01,
    tip: `Stack, align decimals, borrow when needed. Answer: ${round(a - b, 2)}.`,
  };
}
function g7_decMul(): Question {
  const a = randFloat(1.1, 9.9, 1); const b = randFloat(1.1, 9.9, 1);
  return {
    grade: 7, topic: "Decimal ×",
    q: `Multiply: ${a} × ${b}`, expr: `${a} * ${b}`,
    type: "numeric", answer: round(a * b, 2), tolerance: 0.005,
    tip: `Ignore decimals, multiply, then count total decimal places (2) and place the decimal that many from the right. = ${round(a * b, 2)}.`,
  };
}
function g7_decDiv(): Question {
  const dvs = pick([0.2, 0.4, 0.5, 0.25, 1.5, 2.5, 0.8]);
  const q = rand(2, 15); const dvd = round(dvs * q, 2);
  return {
    grade: 7, topic: "Decimal ÷",
    q: `Divide: ${dvd} ÷ ${dvs}`, expr: `${dvd} / ${dvs}`,
    type: "numeric", answer: q, tolerance: 0.01,
    tip: `Move divisor's decimal to make whole, move dividend's the same. Then divide. = ${q}.`,
  };
}
function g7_negInt(): Question {
  const a = rand(-50, 50); const b = rand(-50, 50);
  const op = pick(["+", "−"]);
  const ans = op === "+" ? a + b : a - b;
  return {
    grade: 7, topic: "Integers ±",
    q: `Evaluate: ${a} ${op} ${b}`,
    expr: `${a} ${op === "−" ? "-" : "+"} ${b}`,
    type: "numeric", answer: ans,
    tip: `${op === "−" ? "Subtracting a negative becomes adding. " : ""}Apply same-sign-add / different-sign-subtract rule. = ${ans}.`,
  };
}
function g7_fracAdd(): Question {
  const d1 = pick([2, 3, 4, 5, 6, 8]); const d2 = pick([2, 3, 4, 5, 6, 8]);
  const n1 = rand(1, d1 - 1); const n2 = rand(1, d2 - 1);
  const lcd = (d1 * d2) / gcd(d1, d2);
  const num = n1 * (lcd / d1) + n2 * (lcd / d2);
  const [sn, sd] = simplifyFrac(num, lcd);
  return {
    grade: 7, topic: "Fraction +",
    q: `Add: ${n1}/${d1} + ${n2}/${d2}`,
    type: "numeric", answer: sn / sd, tolerance: 0.001,
    isFraction: true, correctFrac: `${sn}/${sd}`,
    tip: `LCD = ${lcd}. ${n1 * (lcd / d1)}/${lcd} + ${n2 * (lcd / d2)}/${lcd} = ${num}/${lcd} = ${sn}/${sd}.`,
  };
}
function g7_fracMul(): Question {
  const d1 = pick([2, 3, 4, 5, 6]); const d2 = pick([2, 3, 4, 5, 6]);
  const n1 = rand(1, d1 - 1); const n2 = rand(1, d2 - 1);
  const [sn, sd] = simplifyFrac(n1 * n2, d1 * d2);
  return {
    grade: 7, topic: "Fraction ×",
    q: `Multiply: ${n1}/${d1} × ${n2}/${d2}`,
    type: "numeric", answer: sn / sd, tolerance: 0.001,
    isFraction: true, correctFrac: `${sn}/${sd}`,
    tip: `Multiply across: ${n1 * n2}/${d1 * d2} = ${sn}/${sd}.`,
  };
}
function g7_probability(): Question {
  const tot = rand(6, 20); const ev = rand(1, tot - 1);
  const [sn, sd] = simplifyFrac(ev, tot);
  return {
    grade: 7, topic: "Probability",
    q: `A bag has ${ev} red marbles and ${tot - ev} blue. What's P(red)? Give a simplified fraction.`,
    type: "numeric", answer: ev / tot, tolerance: 0.001,
    isFraction: true, correctFrac: `${sn}/${sd}`,
    tip: `P(red) = favorable ÷ total = ${ev}/${tot} = ${sn}/${sd}.`,
  };
}

// ─── Grade 8 ────────────────────────────────────────────────────────

function g8_slope(): Question {
  const x1 = rand(-5, 5); let x2 = rand(-5, 5);
  while (x2 === x1) x2 = rand(-5, 5);
  const y1 = rand(-10, 10); const y2 = rand(-10, 10);
  const slope = (y2 - y1) / (x2 - x1);
  return {
    grade: 8, topic: "Slope",
    q: `Find the SLOPE of the line through (${x1}, ${y1}) and (${x2}, ${y2}).`,
    type: "numeric", answer: slope, tolerance: 0.01,
    isFraction: true,
    correctFrac: `${y2 - y1}/${x2 - x1} = ${round(slope, 3)}`,
    tip: `Slope = (y₂ − y₁) ÷ (x₂ − x₁) = (${y2} − ${y1}) ÷ (${x2} − ${x1}) = ${y2 - y1}/${x2 - x1} = ${round(slope, 3)}.`,
  };
}
function g8_linearY(): Question {
  const m = rand(-5, 5); const b = rand(-10, 10); const x = rand(-5, 5);
  const y = m * x + b;
  return {
    grade: 8, topic: "Linear Eq",
    q: `For the line y = ${m}x ${b >= 0 ? "+ " + b : "− " + Math.abs(b)}, find y when x = ${x}.`,
    type: "numeric", answer: y,
    tip: `Substitute x = ${x}: y = ${m}(${x}) ${b >= 0 ? "+ " + b : "− " + Math.abs(b)} = ${m * x} ${b >= 0 ? "+ " + b : "− " + Math.abs(b)} = ${y}.`,
  };
}
function g8_pythag(): Question {
  const legs = pick([
    [3, 4, 5], [5, 12, 13], [8, 15, 17], [6, 8, 10],
    [7, 24, 25], [9, 12, 15], [9, 40, 41],
  ]);
  const [a, b, c] = legs;
  return {
    grade: 8, topic: "Pythagorean",
    q: `A right triangle has legs of ${a} and ${b}. Find the HYPOTENUSE.`,
    type: "numeric", answer: c,
    tip: `a² + b² = c²:  ${a}² + ${b}² = ${a * a} + ${b * b} = ${a * a + b * b}. √${a * a + b * b} = ${c}.`,
  };
}
function g8_pythagLeg(): Question {
  const legs = pick([[3, 4, 5], [5, 12, 13], [8, 15, 17], [6, 8, 10]]);
  const [a, b, c] = legs;
  return {
    grade: 8, topic: "Pythagorean",
    q: `A right triangle has hypotenuse ${c} and one leg ${a}. Find the other leg.`,
    type: "numeric", answer: b,
    tip: `c² − a² = b²:  ${c}² − ${a}² = ${c * c} − ${a * a} = ${c * c - a * a}. √${c * c - a * a} = ${b}.`,
  };
}
function g8_expProd(): Question {
  const base = rand(2, 6); const e1 = rand(2, 5); const e2 = rand(2, 5);
  return {
    grade: 8, topic: "Exponents",
    q: `Simplify: ${base}^${e1} × ${base}^${e2} = ${base}^?`,
    type: "numeric", answer: e1 + e2,
    tip: `Product of powers rule: keep base, ADD exponents. ${base}^${e1} × ${base}^${e2} = ${base}^${e1 + e2}.`,
  };
}
function g8_expQuot(): Question {
  const base = rand(2, 6); const e1 = rand(5, 10); const e2 = rand(2, 4);
  return {
    grade: 8, topic: "Exponents",
    q: `Simplify: ${base}^${e1} ÷ ${base}^${e2} = ${base}^?`,
    type: "numeric", answer: e1 - e2,
    tip: `Quotient of powers rule: keep base, SUBTRACT exponents. ${base}^${e1} ÷ ${base}^${e2} = ${base}^${e1 - e2}.`,
  };
}
function g8_sqrt(): Question {
  const n = rand(2, 15);
  return {
    grade: 8, topic: "Roots",
    q: `What is √${n * n}?`,
    type: "numeric", answer: n,
    tip: `√${n * n} asks "what number times itself is ${n * n}?" Answer: ${n} (because ${n} × ${n} = ${n * n}).`,
  };
}
function g8_cubeRoot(): Question {
  const n = rand(2, 8);
  return {
    grade: 8, topic: "Roots",
    q: `What is the cube root of ${n * n * n}?  (∛${n * n * n})`,
    type: "numeric", answer: n,
    tip: `∛${n * n * n} asks "what number cubed equals ${n * n * n}?" ${n}×${n}×${n}=${n * n * n}. Answer: ${n}.`,
  };
}
function g8_sciNot(): Question {
  const digit = rand(1, 9); const exp = rand(2, 6);
  const num = digit * Math.pow(10, exp);
  return {
    grade: 8, topic: "Sci. Notation",
    q: `Write ${num.toLocaleString()} in scientific notation.`,
    type: "mc",
    options: shuffle([
      `${digit} × 10^${exp}`,
      `${digit} × 10^${exp - 1}`,
      `${digit * 10} × 10^${exp - 1}`,
      `0.${digit} × 10^${exp + 1}`,
    ]),
    correct: `${digit} × 10^${exp}`,
    tip: `Move the decimal until only one nonzero digit is to its left. ${digit}.0 with ${exp} place(s) moved → ${digit} × 10^${exp}.`,
  };
}
function g8_cylVolume(): Question {
  const r = rand(2, 8); const h = rand(3, 12);
  const V = round(3.14 * r * r * h, 2);
  return {
    grade: 8, topic: "Volume",
    q: `Find the VOLUME of a cylinder with radius ${r} and height ${h}. (π ≈ 3.14)`,
    type: "numeric", answer: V, tolerance: 0.5,
    tip: `V = πr²h = 3.14 × ${r}² × ${h} = 3.14 × ${r * r} × ${h} = ${V}.`,
  };
}
function g8_twoStepNeg(): Question {
  const x = rand(-5, 8); const a = pick([-3, -2, 2, 3, 4, 5]); const b = rand(-15, 15);
  const eq = a * x + b;
  return {
    grade: 8, topic: "Equations",
    q: `Solve: ${a}x + ${b} = ${eq}`,
    type: "numeric", answer: x,
    tip: `Subtract ${b}: ${a}x = ${eq - b}. Divide by ${a}: x = ${x}. (Dividing by negative? Same idea — sign rules apply.)`,
  };
}

// ─── Concept questions (multi-grade) ────────────────────────────────

const conceptQuestions: Question[] = [
  { grade: 5, topic: "Order of Ops", q: "What does PEMDAS stand for?", type: "mc",
    options: ["Parentheses, Exponents, Multiply/Divide, Add/Subtract", "Plus, Equals, Multiply, Divide, Add, Subtract", "Power, Equation, Multiply, Divide, Add, Subtract", "Please Excuse Math, Don't Add Subtract"],
    correct: "Parentheses, Exponents, Multiply/Divide, Add/Subtract",
    tip: "PEMDAS: Parentheses, Exponents, Multiply/Divide (left to right), Add/Subtract (left to right)." },
  { grade: 5, topic: "Volume", q: "Formula for the volume of a rectangular prism (box)?", type: "mc",
    options: ["V = l × w", "V = l + w + h", "V = l × w × h", "V = 2(l + w + h)"],
    correct: "V = l × w × h",
    tip: "Volume = length × width × height. Measured in cubic units (in³, cm³, etc.)." },
  { grade: 5, topic: "Place Value", q: "In 4,257.836, which digit is in the HUNDREDTHS place?", type: "mc",
    options: ["8", "3", "6", "2"], correct: "3",
    tip: "After the decimal: tenths, hundredths, thousandths. So 4,257.836 → 8 tenths, 3 hundredths, 6 thousandths." },
  { grade: 6, topic: "Ratios", q: "What is a RATIO?", type: "mc",
    options: ["The sum of two numbers", "A comparison of two quantities", "The difference of two numbers", "A percentage"],
    correct: "A comparison of two quantities",
    tip: "A ratio compares two quantities. It can be written 3:4, 3 to 4, or 3/4." },
  { grade: 6, topic: "Percent", q: "What does 'percent' literally mean?", type: "mc",
    options: ["Per hundred", "Per ten", "Per thousand", "Per fraction"], correct: "Per hundred",
    tip: "'Percent' comes from per centum = per hundred. So 25% means 25 out of 100, or 25/100 = 1/4 = 0.25." },
  { grade: 6, topic: "Abs Value", q: "|−7| = ?", type: "numeric", answer: 7,
    tip: "Absolute value = distance from zero. Always positive. |−7| = 7." },
  { grade: 6, topic: "Statistics", q: "What is the MODE of a data set?", type: "mc",
    options: ["The middle value", "The average", "The most frequent value", "The range"], correct: "The most frequent value",
    tip: "Mode = most frequent value. A set can have no mode, one mode, or multiple modes." },
  { grade: 7, topic: "Box & Whisker", q: "What 5 numbers does a box plot show?", type: "mc",
    options: ["Min, Q1, mean, Q3, max", "Min, Q1, median, Q3, max", "Mode, median, mean, range, IQR", "Min, mean, median, mode, max"],
    correct: "Min, Q1, median, Q3, max",
    tip: "5-number summary: minimum, lower quartile (Q1), median, upper quartile (Q3), maximum." },
  { grade: 7, topic: "Box & Whisker", q: "IQR = ?", type: "mc",
    options: ["Q3 + Q1", "Q3 − Q1", "max − min", "median × 2"], correct: "Q3 − Q1",
    tip: "IQR (Interquartile Range) = Q3 − Q1. It's the spread of the middle 50% of data." },
  { grade: 7, topic: "Box & Whisker", q: "A low outlier does what to a box plot?", type: "mc",
    options: ["Stretches LEFT whisker; box shifts right", "Stretches right whisker", "No effect", "Removes the median"],
    correct: "Stretches LEFT whisker; box shifts right",
    tip: "A low outlier pulls the left whisker far out. The rest of the data (box and right whisker) shifts to the right." },
  { grade: 7, topic: "Circumference", q: "Formula for circumference?", type: "mc",
    options: ["C = πr²", "C = 2πr or πd", "C = πr", "C = d²π"], correct: "C = 2πr or πd",
    tip: "C = 2πr (radius) or πd (diameter). AREA is πr² — don't mix them up!" },
  { grade: 7, topic: "Circle Area", q: "Formula for area of a circle?", type: "mc",
    options: ["A = 2πr", "A = πr²", "A = πd", "A = π + r²"], correct: "A = πr²",
    tip: "A = πr² ('Cherry pies are square'). Squared radius times pi." },
  { grade: 7, topic: "Circle Parts", q: "What is a CHORD?", type: "mc",
    options: ["A segment with both endpoints on the circle", "Center to edge", "The distance around", "Pi times radius"],
    correct: "A segment with both endpoints on the circle",
    tip: "A chord connects 2 points on the circle. The diameter is a special (longest) chord that passes through the center." },
  { grade: 7, topic: "Stem & Leaf", q: "In a stem-and-leaf plot, the STEM is which place?", type: "mc",
    options: ["Ones", "Tens (or higher)", "Total", "The mean"], correct: "Tens (or higher)",
    tip: "Stem = left digits (usually tens). Leaf = ones digit. 2 | 5 means 25." },
  { grade: 7, topic: "Fraction ÷", q: "'Keep, Change, Flip' means?", type: "mc",
    options: ["Keep first, change ÷ to ×, flip second", "Keep both, change signs, flip answer", "Change first, keep second", "Flip both"],
    correct: "Keep first, change ÷ to ×, flip second",
    tip: "To divide fractions: KEEP first, CHANGE ÷ to ×, FLIP (reciprocal) second. Then multiply." },
  { grade: 7, topic: "% Change", q: "Formula for percent change?", type: "mc",
    options: ["(new + old) ÷ old × 100", "(new − old) ÷ old × 100", "(new − old) ÷ new × 100", "new ÷ old × 100"],
    correct: "(new − old) ÷ old × 100",
    tip: "% change = (new − old) ÷ ORIGINAL × 100. Positive = increase, negative = decrease." },
  { grade: 8, topic: "Slope", q: "Slope formula?", type: "mc",
    options: ["(x₂ − x₁) / (y₂ − y₁)", "(y₂ − y₁) / (x₂ − x₁)", "(y₂ + y₁) / (x₂ + x₁)", "x × y"],
    correct: "(y₂ − y₁) / (x₂ − x₁)",
    tip: "Slope m = rise/run = (y₂ − y₁) / (x₂ − x₁). The change in y over the change in x." },
  { grade: 8, topic: "Linear Eq", q: "In y = mx + b, what is b?", type: "mc",
    options: ["The slope", "The x-intercept", "The y-intercept", "The midpoint"],
    correct: "The y-intercept",
    tip: "y = mx + b — m is slope, b is the y-intercept (where the line crosses the y-axis)." },
  { grade: 8, topic: "Pythagorean", q: "The Pythagorean Theorem applies to which triangles?", type: "mc",
    options: ["All triangles", "Equilateral only", "Right triangles only", "Isosceles only"],
    correct: "Right triangles only",
    tip: "a² + b² = c² works ONLY for right triangles. c is the hypotenuse (longest side, opposite the right angle)." },
  { grade: 8, topic: "Exponents", q: "x^a × x^b = ?", type: "mc",
    options: ["x^(ab)", "x^(a+b)", "x^(a−b)", "x^(a/b)"], correct: "x^(a+b)",
    tip: "Multiplying powers with the SAME BASE: keep the base, ADD the exponents." },
  { grade: 8, topic: "Exponents", q: "x^a ÷ x^b = ?", type: "mc",
    options: ["x^(a−b)", "x^(a/b)", "x^(ab)", "x^(a+b)"], correct: "x^(a−b)",
    tip: "Dividing powers with the SAME BASE: keep the base, SUBTRACT the exponents." },
  { grade: 8, topic: "Sci. Notation", q: "Scientific notation requires the first number (coefficient) to be:", type: "mc",
    options: ["Between 0 and 1", "Greater than or equal to 1, less than 10", "Any integer", "A negative number"],
    correct: "Greater than or equal to 1, less than 10",
    tip: "In a × 10^n, the coefficient 'a' is at least 1 and less than 10. So 7.2 × 10^5 is correct; 72 × 10^4 is not." },
  { grade: 8, topic: "Roots", q: "√64 = ?", type: "numeric", answer: 8,
    tip: "√64 asks: 'what times itself equals 64?' 8 × 8 = 64, so √64 = 8." },
];

// ─── Pool build ─────────────────────────────────────────────────────

type Gen = () => Question;
const PLAN: Array<[Gen, number]> = [
  // Grade 5
  [g5_decAdd, 30], [g5_decSub, 30], [g5_intMul, 25], [g5_intDiv, 20],
  [g5_fracAddLikeDen, 20], [g5_orderOps, 20], [g5_rectArea, 15], [g5_volume, 15],
  [g5_triArea, 15], [g5_placeValue, 15],
  // Grade 6
  [g6_ratio, 18], [g6_percentOf, 25], [g6_findWhole, 15], [g6_integers, 25],
  [g6_absVal, 12], [g6_evalExpr, 20], [g6_meanMedian, 18], [g6_fracDivKCF, 18], [g6_trapezoid, 15],
  // Grade 7
  [g7_boxMedian, 15], [g7_boxQ1Q3, 15], [g7_boxIQR, 12],
  [g7_circumR, 18], [g7_circumD, 15], [g7_circleArea, 18], [g7_radiusFromC, 12],
  [g7_circDiamFromR, 10], [g7_circRadiusFromD, 10],
  [g7_stemRead, 12], [g7_stemCount, 8],
  [g7_percentChange, 15], [g7_discount, 15], [g7_tax, 12],
  [g7_twoStep, 18], [g7_proportion, 15],
  [g7_decAdd, 25], [g7_decSub, 25], [g7_decMul, 18], [g7_decDiv, 15],
  [g7_negInt, 22], [g7_fracAdd, 18], [g7_fracMul, 12], [g7_probability, 15],
  // Grade 8
  [g8_slope, 20], [g8_linearY, 20], [g8_pythag, 18], [g8_pythagLeg, 12],
  [g8_expProd, 15], [g8_expQuot, 15], [g8_sqrt, 15], [g8_cubeRoot, 10],
  [g8_sciNot, 15], [g8_cylVolume, 15], [g8_twoStepNeg, 18],
];

export function buildPool(): Question[] {
  const pool: Question[] = [];
  for (const [gen, n] of PLAN) {
    for (let i = 0; i < n; i++) {
      let q: Question | null = null;
      let tries = 0;
      while (tries++ < 25) {
        q = gen();
        if (q) break;
      }
      if (q) pool.push(q);
    }
  }
  conceptQuestions.forEach((c) => pool.push(c));
  // Dedupe by (grade, q, data).
  const seen = new Set<string>();
  return pool.filter((q) => {
    const k = q.grade + "|" + q.q + (q.data || "");
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// ─── Helpers exported for the UI ────────────────────────────────────

/** Parse a user-entered answer (decimal, fraction, or mixed number). */
export function parseUserAnswer(s: string): number {
  s = s.trim().replace(/,/g, "");
  if (!s) return NaN;
  const mixed = s.match(/^(-?\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) {
    const w = parseInt(mixed[1]);
    const n = parseInt(mixed[2]);
    const d = parseInt(mixed[3]);
    return w >= 0 ? w + n / d : w - n / d;
  }
  if (s.includes("/")) {
    const [n, d] = s.split("/").map(Number);
    if (isFinite(n) && isFinite(d) && d !== 0) return n / d;
    return NaN;
  }
  return parseFloat(s);
}

/** Pretty-print the canonical correct answer for the feedback line. */
export function answerText(q: Question): string {
  if (q.type === "mc") return q.correct ?? "";
  if (q.isFraction && q.correctFrac) return `${q.correctFrac} (or ${round(q.answer ?? 0, 3)})`;
  return String(q.answer);
}

/** Round-to-fixed without trailing zeros. */
export { round };
