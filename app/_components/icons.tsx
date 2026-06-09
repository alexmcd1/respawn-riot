// Small line-art icon set. Replaces the emoji glyphs we'd been
// stuffing into MiniAppNav tabs and card chips — emojis render as
// platform-specific color images and visually scream "AI demo
// content," while these are tiny monochrome SVGs that pick up the
// current text color and sit alongside the typography cleanly.
//
// Conventions:
//   * 18×18 viewBox so they line up with adjacent text at 14–18px
//   * `fill="none"` + `stroke="currentColor"` — color comes from
//     the parent's text color (active vs inactive tab state)
//   * stroke-width 1.6 reads sharp at 16–20px without going chunky
//   * default size = h-4 w-4 (16px); pass className to upsize
//   * aria-hidden by default — these are decorative, the adjacent
//     text label is the accessible name

import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { className?: string };

const BASE: SVGProps<SVGSVGElement> = {
  viewBox: "0 0 18 18",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
};

const cn = (extra?: string) => `h-4 w-4 ${extra ?? ""}`.trim();

// ─── Books / reading ─────────────────────────────────────────────────

/** Open book — used for sci-fi/fantasy series tab + general books eyebrow. */
export function IconBook({ className, ...rest }: IconProps) {
  return (
    <svg {...BASE} className={cn(className)} {...rest}>
      <path d="M9 4.5v10" />
      <path d="M2.5 4.5c1.8-.7 4.4-.7 6.5.5" />
      <path d="M15.5 4.5c-1.8-.7-4.4-.7-6.5.5" />
      <path d="M2.5 4.5v9.3c1.8-.7 4.4-.7 6.5.5" />
      <path d="M15.5 4.5v9.3c-1.8-.7-4.4-.7-6.5.5" />
    </svg>
  );
}

/** Crescent moon — used for psychological thrillers (night/shadow energy). */
export function IconCrescent({ className, ...rest }: IconProps) {
  return (
    <svg {...BASE} className={cn(className)} {...rest}>
      <path d="M13.6 11.5a5.4 5.4 0 1 1-6.7-7.8 4.5 4.5 0 0 0 6.7 7.8z" />
    </svg>
  );
}

// ─── News / media ────────────────────────────────────────────────────

/** Newspaper — folded page with content lines. Replaces 📰. */
export function IconNews({ className, ...rest }: IconProps) {
  return (
    <svg {...BASE} className={cn(className)} {...rest}>
      <rect x="2.5" y="3.5" width="11" height="11" rx="1" />
      <path d="M13.5 6.5h2v7a1.2 1.2 0 0 1-1.2 1.2" />
      <path d="M5 6.5h6M5 9h6M5 11.5h4" />
    </svg>
  );
}

// ─── Hot / fire ──────────────────────────────────────────────────────

/** Flame outline — used for "Hot Now" tabs. Replaces 🔥. */
export function IconFlame({ className, ...rest }: IconProps) {
  return (
    <svg {...BASE} className={cn(className)} {...rest}>
      <path d="M9 2.5c.5 2.5 3 3.5 3 6.5a3 3 0 0 1-6 0c0-1.2.6-2 1.4-2.5C7.7 7.4 8.5 6 9 4.5z" />
      <path d="M8.5 12c.4 1 1.2 1.4 1.2 2.2a1 1 0 0 1-2 0c0-.6.4-1.2.8-2.2z" />
    </svg>
  );
}

// ─── Games / play ────────────────────────────────────────────────────

/** Game controller — D-pad on left, two action buttons on right. */
export function IconGamepad({ className, ...rest }: IconProps) {
  return (
    <svg {...BASE} className={cn(className)} {...rest}>
      <path d="M5.5 6h7a3 3 0 0 1 3 3v1a2.5 2.5 0 0 1-4.5 1.4l-.5-.7a2 2 0 0 0-1.6-.8h-1a2 2 0 0 0-1.6.8l-.5.7A2.5 2.5 0 0 1 2.5 10V9a3 3 0 0 1 3-3z" />
      <path d="M5 8.5v1.5M4.25 9.25h1.5" />
      <circle cx="12" cy="9" r="0.6" />
      <circle cx="13.5" cy="8" r="0.6" />
    </svg>
  );
}

// ─── Build / devlog ──────────────────────────────────────────────────

/** Wrench — for the build log / devlog tab. Replaces ✦/🛠. */
export function IconWrench({ className, ...rest }: IconProps) {
  return (
    <svg {...BASE} className={cn(className)} {...rest}>
      <path d="M12.7 2.5a3.5 3.5 0 0 0-4 4l-5 5a1.4 1.4 0 0 0 2 2l5-5a3.5 3.5 0 0 0 4-4l-2 2-1.5-.5-.5-1.5z" />
    </svg>
  );
}

// ─── LEGO ────────────────────────────────────────────────────────────

/** 2×2 LEGO brick — two studs on top, body below. */
export function IconBrick({ className, ...rest }: IconProps) {
  return (
    <svg {...BASE} className={cn(className)} {...rest}>
      <rect x="3" y="6" width="12" height="8" rx="0.6" />
      <circle cx="6.5" cy="5" r="1.3" />
      <circle cx="11.5" cy="5" r="1.3" />
      <path d="M3 9.5h12" opacity="0.35" />
    </svg>
  );
}

// ─── Comic Con / hero ────────────────────────────────────────────────

/** Comic burst — uneven pointed star like a Pow!/Bam! caption. */
export function IconBurst({ className, ...rest }: IconProps) {
  return (
    <svg {...BASE} className={cn(className)} {...rest}>
      <path d="M9 2l1.4 3.2L14 4l-1.4 3.4L16 9l-3.4 1.4L14 14l-3.6-1.2L9 16l-1.4-3.2L4 14l1.4-3.4L2 9l3.4-1.4L4 4l3.6 1.2z" />
    </svg>
  );
}

// ─── Crochet / yarn ──────────────────────────────────────────────────

/** Ball of yarn with a loose strand hanging off. */
export function IconYarn({ className, ...rest }: IconProps) {
  return (
    <svg {...BASE} className={cn(className)} {...rest}>
      <circle cx="8.5" cy="9.5" r="5" />
      <path d="M5 7.5c1.5 1.5 4 2 7 1" />
      <path d="M4.5 10.5c2 1 4.5 1.5 8 .5" />
      <path d="M6 13c1.5.5 3.5.7 6 0" />
      <path d="M13 13l2 2.5" />
    </svg>
  );
}

// ─── Food ────────────────────────────────────────────────────────────

/** Clipboard with checkmarks — Recipes tab. Replaces 📋. */
export function IconClipboard({ className, ...rest }: IconProps) {
  return (
    <svg {...BASE} className={cn(className)} {...rest}>
      <rect x="4" y="3.5" width="10" height="11" rx="1" />
      <rect x="6.5" y="2.5" width="5" height="2" rx="0.5" />
      <path d="M6.5 8l1.2 1.2L9.5 7.4" />
      <path d="M11 8.5h1.5M6.5 11.5l1.2 1.2L9.5 11M11 12h1.5" />
    </svg>
  );
}

/** Fork + knife crossed — Eat Out tab. Replaces 🍴. */
export function IconFork({ className, ...rest }: IconProps) {
  return (
    <svg {...BASE} className={cn(className)} {...rest}>
      <path d="M5.5 2.5v5a2 2 0 0 0 2 2v6" />
      <path d="M4 2.5v3.5M7 2.5v3.5" />
      <path d="M12 2.5v13" />
      <path d="M12 2.5a2.5 2.5 0 0 1 2 2.4v3.6h-2" />
    </svg>
  );
}

/** House outline — In House tab. Replaces 🏠. */
export function IconHouse({ className, ...rest }: IconProps) {
  return (
    <svg {...BASE} className={cn(className)} {...rest}>
      <path d="M2.5 9l6.5-6 6.5 6" />
      <path d="M4 8v7h10V8" />
      <path d="M7.5 15v-4h3v4" />
    </svg>
  );
}

/** Shopping cart — Shopping tab. Replaces 🛒. */
export function IconCart({ className, ...rest }: IconProps) {
  return (
    <svg {...BASE} className={cn(className)} {...rest}>
      <path d="M2.5 3.5h1.8l1.7 8.5a1 1 0 0 0 1 .8h6a1 1 0 0 0 1-.8L15.5 6h-10" />
      <circle cx="6.5" cy="15" r="1" />
      <circle cx="12.5" cy="15" r="1" />
    </svg>
  );
}

/** Four-pointed sparkle — generic favorites / "my stuff". */
export function IconSparkle({ className, ...rest }: IconProps) {
  return (
    <svg {...BASE} className={cn(className)} {...rest}>
      <path d="M9 2v4M9 12v4M2 9h4M12 9h4" />
      <path d="M5 5l2 2M11 11l2 2M5 13l2-2M11 7l2-2" />
    </svg>
  );
}

// ─── Chat / forum ────────────────────────────────────────────────────

/** Speech bubble — Now Playing forum tab. */
export function IconChat({ className, ...rest }: IconProps) {
  return (
    <svg {...BASE} className={cn(className)} {...rest}>
      <path d="M3 5.5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H8l-3 2.5V12.5H5a2 2 0 0 1-2-2z" />
      <circle cx="6.5" cy="8" r="0.5" fill="currentColor" />
      <circle cx="9" cy="8" r="0.5" fill="currentColor" />
      <circle cx="11.5" cy="8" r="0.5" fill="currentColor" />
    </svg>
  );
}
