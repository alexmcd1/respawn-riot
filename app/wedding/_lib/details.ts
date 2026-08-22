// ═══════════════════════════════════════════════════════════════════
//   THE ONE FILE TO EDIT FOR WEDDING DETAILS.
//
//   Everything on /wedding reads from here — countdown, hero, venue
//   info, story, guest info, playlist notes. Change a field, save,
//   the page updates. No component code needed.
// ═══════════════════════════════════════════════════════════════════

/** The main wedding date/time. Update once it's set.
 *  Format: ISO 8601 with Eastern timezone offset (Florida).
 *  Set to null while still TBD — the countdown gracefully shows
 *  "date TBD" until you fill this in. */
export const WEDDING_AT: string | null = null;
// Example when you set it:
// export const WEDDING_AT = "2027-10-16T17:00:00-04:00";

/** Placeholder venue info — plain strings so you can edit inline.
 *  Any field can be left as the empty string; sections auto-hide. */
export const WEDDING_DETAILS = {
  brideName: "Marlinda",
  groomName: "Kid Ghost",
  /** Short subtitle shown under the couple names. */
  tagline: "Til Death Do Us Rock",
  /** Shown above the countdown when the date is set; e.g. "Save the Date". */
  eyebrow: "SAVE THE DATE",
  /** Ceremony venue. */
  ceremony: {
    venue: "",       // e.g. "The Estate on the Halifax"
    address: "",     // e.g. "1900 N Halifax Ave, Daytona Beach, FL"
    time: "",        // e.g. "5:00 PM"
  },
  /** Reception venue (may be the same as ceremony). */
  reception: {
    venue: "",
    address: "",
    time: "",
  },
  /** Dress code line. Punk-optional is on-brand. */
  dressCode: "Punk formal · black tie encouraged · leather welcome",
  /** RSVP link (Zola / The Knot / a Google Form / whatever). */
  rsvpUrl: "",
  /** Gift registry link. */
  registryUrl: "",
  /** Hotel block or travel notes. */
  travelNotes: "",
} as const;

/** Free-form "how we met" story. Rendered as paragraphs — separate
 *  paragraphs with a blank line. */
export const OUR_STORY = `
Fill this in with the story of how you two met. Where, when, the moment you
knew. It's the section people love most — don't overthink the wording.

Add as many paragraphs as you like; each blank line becomes a new one.
`;

/** Rough timeline of key milestones. Add / remove / edit as you like. */
export const TIMELINE: Array<{ date: string; label: string; body?: string }> = [
  { date: "TBD", label: "The proposal", body: "Where it happened, who was there." },
  { date: "TBD", label: "Engagement party", body: "" },
  { date: "TBD", label: "Bachelor / Bachelorette weekend", body: "" },
  { date: "TBD", label: "Rehearsal dinner", body: "" },
  { date: "TBD", label: "The wedding", body: "" },
];

/** Wedding party — bridesmaids, groomsmen, whoever. */
export const WEDDING_PARTY: Array<{
  side: "bride" | "groom";
  role: string;
  name: string;
}> = [
  // Example rows — edit or delete freely:
  // { side: "bride", role: "Maid of Honor", name: "" },
  // { side: "groom", role: "Best Man", name: "" },
];

/** Curated pop-punk / rock / emo wedding playlist. Ordered by moment:
 *  processional → first dance → reception → last dance. Each track is
 *  hand-picked to fit a punk-wedding vibe.
 *
 *  When Spotify links exist, drop them into `href`. */
export type PlaylistTrack = {
  moment: "Processional" | "First Dance" | "Reception" | "Last Dance";
  title: string;
  artist: string;
  href?: string;
  note?: string;
};

export const PLAYLIST: PlaylistTrack[] = [
  // Walk down the aisle
  { moment: "Processional", title: "Everlong (Acoustic)", artist: "Foo Fighters", note: "The obvious one. Devastating in the right way." },
  { moment: "Processional", title: "Hey There Delilah", artist: "Plain White T's" },
  { moment: "Processional", title: "I Wanna Grow Old With You", artist: "Adam Sandler", note: "The Wedding Singer version — cheesy on purpose." },

  // First dance
  { moment: "First Dance", title: "Grow Old With You", artist: "Adam Sandler", note: "Same energy as above but slower — pick one." },
  { moment: "First Dance", title: "You And I", artist: "Ingrid Michaelson" },
  { moment: "First Dance", title: "Better Together", artist: "Jack Johnson", note: "If you want to keep it chill." },

  // Reception dance floor
  { moment: "Reception", title: "Mr. Brightside", artist: "The Killers", note: "The obligatory one. Everyone knows every word." },
  { moment: "Reception", title: "1985", artist: "Bowling For Soup" },
  { moment: "Reception", title: "Ocean Avenue", artist: "Yellowcard" },
  { moment: "Reception", title: "Sugar, We're Goin Down", artist: "Fall Out Boy" },
  { moment: "Reception", title: "Punk Rock Princess", artist: "Something Corporate", note: "On-brand for the bride." },
  { moment: "Reception", title: "Basket Case", artist: "Green Day" },
  { moment: "Reception", title: "First Date", artist: "Blink-182" },
  { moment: "Reception", title: "Semi-Charmed Life", artist: "Third Eye Blind" },
  { moment: "Reception", title: "Complicated", artist: "Avril Lavigne", note: "The bride's high school will thank you." },
  { moment: "Reception", title: "The Great Escape", artist: "Boys Like Girls" },
  { moment: "Reception", title: "Miss Jackson", artist: "Panic! At The Disco" },

  // Last dance / send-off
  { moment: "Last Dance", title: "Time of Your Life (Good Riddance)", artist: "Green Day", note: "The classic wedding send-off." },
  { moment: "Last Dance", title: "Closing Time", artist: "Semisonic" },
];

/** Planning checklist — categorized to-do items. Edit freely. */
export type PlanTask = {
  category: "Venue" | "Vendors" | "Attire" | "Guests" | "Ceremony" | "Reception" | "Legal" | "Personal";
  label: string;
  done?: boolean;
};

export const PLANNING_TASKS: PlanTask[] = [
  { category: "Venue", label: "Set the date" },
  { category: "Venue", label: "Book ceremony venue" },
  { category: "Venue", label: "Book reception venue" },
  { category: "Vendors", label: "Book photographer" },
  { category: "Vendors", label: "Book videographer" },
  { category: "Vendors", label: "Book DJ / band" },
  { category: "Vendors", label: "Book florist" },
  { category: "Vendors", label: "Book caterer" },
  { category: "Vendors", label: "Book cake / dessert" },
  { category: "Vendors", label: "Book officiant" },
  { category: "Attire", label: "Dress fittings" },
  { category: "Attire", label: "Suit / tux fittings" },
  { category: "Attire", label: "Wedding rings" },
  { category: "Attire", label: "Wedding party attire" },
  { category: "Guests", label: "Draft guest list" },
  { category: "Guests", label: "Order save-the-dates" },
  { category: "Guests", label: "Order invitations" },
  { category: "Guests", label: "Hotel room block" },
  { category: "Guests", label: "RSVP tracking" },
  { category: "Ceremony", label: "Write vows" },
  { category: "Ceremony", label: "Choose processional music" },
  { category: "Ceremony", label: "Rehearsal dinner plan" },
  { category: "Reception", label: "First dance song" },
  { category: "Reception", label: "Seating chart" },
  { category: "Reception", label: "Toasts / speeches order" },
  { category: "Reception", label: "Send-off plan" },
  { category: "Legal", label: "Marriage license" },
  { category: "Legal", label: "Name-change paperwork (if applicable)" },
  { category: "Personal", label: "Honeymoon plans" },
  { category: "Personal", label: "Gift registry live" },
];
