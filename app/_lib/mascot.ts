// ═════════════════════════════════════════════════════════════════════════
//
//   THE KID GHOST — CHARACTER BIBLE
//
//   Canonical reference for the site's mascot. Use these specs + prompts
//   whenever generating new art so the character stays consistent
//   across every appearance.
//
//   Last updated: 2026-06 (initial pass — original prompts that
//   produced the current /public/mascot/* art set)
//
// ═════════════════════════════════════════════════════════════════════════

/**
 * Character spec exported for use in code (alt text, ARIA labels,
 * placeholder descriptions, future profile cards, etc).
 */
export const KID_GHOST = {
  name: "The Kid Ghost",
  shortName: "Kid",
  age: "Forever 16",

  vibe: "Stuck on the last good summer. Reads as tragic but isn't.",

  // The four anchors that make him recognizable across any pose/scene.
  // Drop any of these = it's no longer Kid Ghost.
  visualAnchors: [
    "Skeleton, chibi-proportioned teen build",
    "Oversized patched black leather jacket two sizes too big",
    "Big chunky over-ear headphones (never not on)",
    "Single glowing fuchsia pixel in left eye socket (the 'save file')",
  ] as const,

  // Always-on accessories
  alwaysHas: [
    "Headphones (he never tells you what he's listening to)",
    "Messy jet-black emo bangs over the right eye socket",
    "Drippy fuchsia + cyan spray-paint splashes",
    "Patches & pins on jacket (anarchy 'A', lightning bolt, " +
      "Blink-182-style smiley, cracked-heart, safety pin, X of duct tape)",
  ] as const,

  // Why he is what he is
  backstory:
    "Got 'respawned' wrong once. The fuchsia pixel in his eye socket is " +
    "the save file. Doesn't know how it happened. Stopped asking.",

  // How he talks (use for any UI copy attributed to him — empty states,
  // 404 page, error messages, sign-off lines)
  voice: {
    register: "dry, deadpan, lowercase",
    flourish: "occasional ALL-CAPS for emphasis",
    ironyTells: "uses 'lol' ironically",
    signOff: "—kg",
  },

  // Drop-in copy you can pull for empty states / errors / loading
  sampleLines: [
    "respawn'd. again. lol",
    "the timeline is fake. press start.",
    "i'd say more but my battery's at 4%",
    "today's mood: SCANLINES",
  ] as const,

  // Universal style direction (lift verbatim into new prompts)
  styleDirection:
    "love-child of My Chemical Romance 'Black Parade' theatrical-" +
    "skeleton art and Blink-182 cartoon mascots, with early-2000s " +
    "pop-punk album-cover energy (Alkaline Trio, Fall Out Boy, " +
    "Sum 41). Bold black ink linework, halftone dot shading, " +
    "spray-paint texture, gritty edges, slightly grimy.",

  // Locked palette — do not stray
  palette: {
    primary: ["black", "bone white"] as const,
    neon: ["neon fuchsia", "electric cyan"] as const,
    accent: ["acid green (one streak)"] as const,
  },
} as const;

// ═════════════════════════════════════════════════════════════════════════
//
//   THE ORIGINAL PROMPTS (the ones that produced the art currently
//   in /public/mascot/). Drop these straight into Midjourney / DALL-E /
//   Ideogram when commissioning new pieces in the same style.
//
// ═════════════════════════════════════════════════════════════════════════

/**
 * #1. HERO PORTRAIT — the canon mascot.
 * Use this first when generating any new "headshot" or "centered
 * sticker" art. Establishes the character DNA. Produced
 * /public/mascot/portrait.png (or whichever image is currently used
 * as the canonical head-and-shoulders representation).
 */
export const PROMPT_HERO_PORTRAIT = `
A bold cartoon mascot named "The Kid Ghost." Subject is a chibi-
proportioned teenage skeleton from the chest up, slightly slouched
with attitude. He wears an oversized black leather jacket two sizes
too big, covered in handmade patches and pins: a red anarchy "A,"
a yellow lightning bolt, a torn Blink-182-style smiley face sticker,
a small red heart with a crack through it, a safety pin, an X of
duct tape on one collar. Messy jet-black emo bangs hang over his
right eye socket. The left eye socket is empty except for a single
glowing fuchsia pixel — like a tiny CRT pinprick. Big chunky over-
ear headphones rest on his skull. One bony hand holds a busted,
cracked Nintendo Game Boy with the screen lit cyan. The other hand
is tucked into the jacket pocket. Splashes and drips of fuchsia and
cyan spray-paint bleed across his jacket and chest.

Style: a love-child of My Chemical Romance "Black Parade" theatrical-
skeleton art and Blink-182 cartoon mascots, with early-2000s pop-
punk album-cover energy (Alkaline Trio, Fall Out Boy, Sum 41). Bold
black ink linework, halftone dot shading, spray-paint texture,
gritty edges, slightly grimy.

Color palette: black, bone white, neon fuchsia, electric cyan, one
streak of acid-green.

Background: matte black with subtle scanlines and a hand-drawn
"RIOT" tag in the corner.

Composition: dead-center, sticker-style — designed to be cropped or
cut out cleanly. NOT photorealistic. 1:1 square.
`.trim();

/**
 * #2. STICKER / FAVICON VERSION — same character, simpler.
 * Use this for: nav avatar, favicon, browser tab icon, email
 * letterhead, social profile photo. Produced /public/mascot/sticker.png.
 */
export const PROMPT_STICKER = `
Same character as before — "The Kid Ghost," teen skeleton in a
patched leather jacket with one fuchsia-pixel eye socket and emo
bangs — but rendered as a single high-contrast die-cut vinyl
sticker, head only, white sticker border, flat black + white + neon
fuchsia, bold thick lines, no shading, viewable at very small sizes.
Skate sticker art style. 1:1 square.
`.trim();

/**
 * #3. FULL BODY — for banner cameos.
 * Use this for: hero sections, "Meet the Kid Ghost" panels, marketing
 * art, in-page mascot cameos. Produced /public/mascot/fullbody.png.
 */
export const PROMPT_FULL_BODY = `
Same character — "The Kid Ghost." Full body, three-quarter view,
leaning on a beat-up cracked Game Boy that's the size of a
skateboard. Black skinny jeans, beat-up checker-laced Vans,
mismatched striped socks. Patched leather jacket, drippy spray-
paint, cracked-heart pin, headphones around skull, fuchsia-pixel
eye socket, emo bangs. He's holding up a two-finger peace sign with
one bony hand.

Same MCR-Blink-pop-punk illustration style — bold ink, halftone
dots, spray-paint splatter, scanline grit. Black background with a
hand-tagged "RESPAWN/RIOT" graffiti behind him.

Aspect: 3:4 portrait.
`.trim();

// ═════════════════════════════════════════════════════════════════════════
//
//   PROMPT TEMPLATE for new scenes / poses (e.g. Kid Ghost holding a
//   pirate-radio mic for the Creativity Corner, or sleeping on a
//   couch for an "offline" page). Fill in [scene/pose] and any
//   scene-specific props. Everything else stays locked.
//
// ═════════════════════════════════════════════════════════════════════════

export const PROMPT_TEMPLATE = `
[scene / pose / props specific to this piece], the Kid Ghost — a
chibi-proportioned teenage skeleton mascot:

- oversized patched black leather jacket two sizes too big (with the
  usual patches: anarchy A, lightning bolt, cracked smiley, safety
  pin, duct-tape X)
- large over-ear headphones on his skull
- single glowing fuchsia pixel in left eye socket (his "save file")
- messy jet-black emo bangs over right eye socket
- drippy fuchsia + cyan spray-paint splashes

Style: love-child of My Chemical Romance "Black Parade" theatrical-
skeleton art and Blink-182 cartoon mascots, with early-2000s pop-
punk album-cover energy. Bold black ink linework, halftone dot
shading, spray-paint texture, gritty edges.

Palette: black, bone white, neon fuchsia, electric cyan, one streak
of acid-green.

Background: [scene-specific or matte black with scanlines].

[aspect ratio: 1:1 / 3:4 / 16:9 — pick one]
`.trim();

// ═════════════════════════════════════════════════════════════════════════
//
//   GENERATOR-SPECIFIC TUNING
//
//   Append these flags after the prompt body when using each tool.
//
// ═════════════════════════════════════════════════════════════════════════

export const MIDJOURNEY_FLAGS = {
  // Square hero / sticker
  square: "--ar 1:1 --s 250 --style raw",
  // Portrait full-body
  portrait: "--ar 3:4 --s 250 --style raw",
  // Banner / wide cameo
  wide: "--ar 16:9 --s 250 --style raw",
  // Lock character consistency across multiple pieces — pass URL of a
  // previously approved render of Kid Ghost
  characterReferenceFlag: "--cref [url-to-approved-kid-ghost-render]",
} as const;

// Best generator per prompt type (empirically — update as new models drop):
//   Hero portrait + full body → Midjourney v6/v7
//   Sticker / favicon       → ChatGPT (DALL-E 3) or Ideogram
//   Anything with readable text (a "RIOT" tag, a sign, a t-shirt) → Ideogram

// ═════════════════════════════════════════════════════════════════════════
//
//   CURRENT ART INVENTORY (files in /public/mascot/)
//
//   File              Used by                                  Source prompt
//   ────              ───────                                  ─────────────
//   sticker.png       NavBar avatar, browser tab               #2 sticker
//   animated.gif      Homepage hero (animated loop)            (variant of #1)
//   portrait.png      (unused — reserve for future)            #1 hero portrait
//   fullbody.png      Homepage "Meet the Kid Ghost" section    #3 full body
//   battery.jpg       Orlando page weather fallback, 404 page  custom — "Kid
//                     ("Signal lost" — battery at 4%)            Ghost with
//                                                                steaming coffee,
//                                                                'battery: 4%'
//                                                                indicator,
//                                                                low-battery
//                                                                vibe"
//
// ═════════════════════════════════════════════════════════════════════════
