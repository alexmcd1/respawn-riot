import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import Countdown from "./_components/Countdown";
import PlanningChecklist from "./_components/PlanningChecklist";
import DogParade from "./_components/DogParade";
import {
  OUR_STORY,
  PLAYLIST,
  TIMELINE,
  WEDDING_AT,
  WEDDING_DETAILS,
  WEDDING_PARTY,
  type PlaylistTrack,
} from "./_lib/details";

export const metadata: Metadata = {
  title: `${WEDDING_DETAILS.groomName} & ${WEDDING_DETAILS.brideName} — Wedding`,
  description: WEDDING_DETAILS.tagline,
  // Keep this page out of search indexes — it's private.
  robots: { index: false, follow: false },
};

const MOMENT_ORDER: PlaylistTrack["moment"][] = [
  "Processional",
  "First Dance",
  "Reception",
  "Last Dance",
];

export default function WeddingPage() {
  const d = WEDDING_DETAILS;
  const storyParas = OUR_STORY.trim().split(/\n\s*\n/).map((p) => p.trim());
  const hasCeremony = d.ceremony.venue || d.ceremony.address;
  const hasReception = d.reception.venue || d.reception.address;
  const bridesmaids = WEDDING_PARTY.filter((p) => p.side === "bride");
  const groomsmen = WEDDING_PARTY.filter((p) => p.side === "groom");

  // Group playlist by moment for rendering.
  const playlistByMoment = MOMENT_ORDER.map((m) => ({
    moment: m,
    tracks: PLAYLIST.filter((t) => t.moment === m),
  })).filter((g) => g.tracks.length > 0);

  return (
    <main className="bg-black text-white">
      {/* Little dogs trot along the bottom of the screen cheering the
          couple on — Boston terriers + a dachshund. Fixed overlay,
          pointer-events-none, so it never blocks the page. */}
      <DogParade />
      {/* ─── Hero — features the Kid Ghost & Marlinda wedding illustration.
          The art is a tall B&W portrait (1122×1402), not a wide banner, so
          it gets a framed "zine print" treatment beside the text rather
          than the object-cover crop the channel ChannelBanner uses (which
          would slice the couple in half). White art background sits on a
          white mat + rose frame so it reads as an intentional print. */}
      <section className="relative overflow-hidden border-b border-rose-500/30 scanlines">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(244,63,94,0.25),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(217,70,239,0.16),transparent_55%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-2 stripe-band" />

        <div className="relative mx-auto grid max-w-6xl items-center gap-8 px-6 py-12 sm:py-16 lg:grid-cols-[minmax(0,420px)_1fr] lg:gap-12">
          {/* Illustration — framed like a punk-zine / tattoo-flash print. */}
          <div className="mx-auto w-full max-w-sm lg:max-w-none">
            <div className="rotate-[-1.2deg] rounded-3xl border border-rose-300/40 bg-white p-2.5 shadow-[0_0_60px_-12px_rgba(244,63,94,0.55)] transition-transform hover:rotate-0 sm:p-3">
              <Image
                src="/banners/wedding.png"
                alt="Kid Ghost and Marlinda — a punk skeleton bride and groom, TIL DEATH DO US ROCK"
                width={1122}
                height={1402}
                priority
                sizes="(min-width: 1024px) 420px, 90vw"
                className="h-auto w-full rounded-2xl"
              />
            </div>
          </div>

          {/* Text block */}
          <div className="text-center lg:text-left">
            <p className="font-mono text-[11px] uppercase tracking-[0.4em] text-rose-300">
              {d.eyebrow}
            </p>
            <h1 className="mt-4 font-display text-5xl uppercase leading-[0.95] tracking-[0.02em] sm:text-6xl xl:text-7xl">
              {d.groomName}
              <span className="mx-3 text-rose-400">&amp;</span>
              {d.brideName}
            </h1>
            <p className="mt-4 font-display text-lg uppercase tracking-[0.25em] text-white/70 sm:text-xl">
              {d.tagline}
            </p>

            <div className="mx-auto mt-8 max-w-md lg:mx-0">
              <Countdown weddingAt={WEDDING_AT} />
            </div>

            {(d.rsvpUrl || d.registryUrl) && (
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
                {d.rsvpUrl && (
                  <Link
                    href={d.rsvpUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md bg-gradient-to-br from-rose-500 to-pink-500 px-6 py-3 font-display text-sm uppercase tracking-[0.2em] text-black transition hover:scale-[1.03]"
                  >
                    RSVP
                  </Link>
                )}
                {d.registryUrl && (
                  <Link
                    href={d.registryUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md border border-rose-400/50 px-6 py-3 font-display text-sm uppercase tracking-[0.2em] text-rose-100 transition hover:bg-rose-500/10"
                  >
                    Registry
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ─── Our Story ────────────────────────────────────────────── */}
      <section className="border-t border-white/10 px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-display text-2xl uppercase tracking-[0.04em] sm:text-3xl">
            Our Story
          </h2>
          <div className="mt-4 space-y-4 text-white/75">
            {storyParas.map((p, i) => (
              <p key={i} className="leading-relaxed">
                {p}
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* ─── The Details (venue) ──────────────────────────────────── */}
      {(hasCeremony || hasReception || d.dressCode || d.travelNotes) && (
        <section className="border-t border-white/10 bg-zinc-950 px-6 py-16">
          <div className="mx-auto max-w-4xl">
            <h2 className="font-display text-2xl uppercase tracking-[0.04em] sm:text-3xl">
              The Details
            </h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {hasCeremony && (
                <DetailCard title="Ceremony">
                  {d.ceremony.venue && <p className="text-white/85">{d.ceremony.venue}</p>}
                  {d.ceremony.address && <p className="text-sm text-white/55">{d.ceremony.address}</p>}
                  {d.ceremony.time && <p className="mt-1 font-mono text-xs uppercase tracking-[0.2em] text-fuchsia-200">{d.ceremony.time}</p>}
                </DetailCard>
              )}
              {hasReception && (
                <DetailCard title="Reception">
                  {d.reception.venue && <p className="text-white/85">{d.reception.venue}</p>}
                  {d.reception.address && <p className="text-sm text-white/55">{d.reception.address}</p>}
                  {d.reception.time && <p className="mt-1 font-mono text-xs uppercase tracking-[0.2em] text-fuchsia-200">{d.reception.time}</p>}
                </DetailCard>
              )}
              {d.dressCode && (
                <DetailCard title="Dress Code">
                  <p className="text-white/85">{d.dressCode}</p>
                </DetailCard>
              )}
              {d.travelNotes && (
                <DetailCard title="Travel & Stay">
                  <p className="text-white/85">{d.travelNotes}</p>
                </DetailCard>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ─── Timeline ─────────────────────────────────────────────── */}
      <section className="border-t border-white/10 px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-display text-2xl uppercase tracking-[0.04em] sm:text-3xl">
            Road to the Altar
          </h2>
          <ol className="mt-6 space-y-3">
            {TIMELINE.map((item, i) => (
              <li
                key={i}
                className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
              >
                <div className="shrink-0 font-mono text-[11px] uppercase tracking-[0.2em] text-fuchsia-300">
                  {item.date}
                </div>
                <div className="min-w-0">
                  <p className="font-display text-base uppercase tracking-wide">{item.label}</p>
                  {item.body && <p className="mt-1 text-sm text-white/60">{item.body}</p>}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ─── Wedding Party ───────────────────────────────────────── */}
      {WEDDING_PARTY.length > 0 && (
        <section className="border-t border-white/10 bg-zinc-950 px-6 py-16">
          <div className="mx-auto max-w-4xl">
            <h2 className="font-display text-2xl uppercase tracking-[0.04em] sm:text-3xl">
              The Crew
            </h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              {bridesmaids.length > 0 && (
                <div>
                  <h3 className="font-mono text-[11px] uppercase tracking-[0.28em] text-fuchsia-200/80">
                    {d.brideName}&apos;s Side
                  </h3>
                  <ul className="mt-3 space-y-2">
                    {bridesmaids.map((p, i) => (
                      <PartyRow key={i} role={p.role} name={p.name} />
                    ))}
                  </ul>
                </div>
              )}
              {groomsmen.length > 0 && (
                <div>
                  <h3 className="font-mono text-[11px] uppercase tracking-[0.28em] text-cyan-200/80">
                    {d.groomName}&apos;s Side
                  </h3>
                  <ul className="mt-3 space-y-2">
                    {groomsmen.map((p, i) => (
                      <PartyRow key={i} role={p.role} name={p.name} />
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ─── Playlist ─────────────────────────────────────────────── */}
      <section className="border-t border-white/10 px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-display text-2xl uppercase tracking-[0.04em] sm:text-3xl">
            The Setlist
          </h2>
          <p className="mt-1 text-sm text-white/60">
            A punk-wedding soundtrack, sequenced by moment. Swap freely — this is
            just a starting point.
          </p>
          <div className="mt-6 space-y-8">
            {playlistByMoment.map((group) => (
              <div key={group.moment}>
                <h3 className="font-mono text-[11px] uppercase tracking-[0.28em] text-fuchsia-200/80">
                  {group.moment}
                </h3>
                <ul className="mt-3 divide-y divide-white/5 rounded-2xl border border-white/10 bg-white/[0.03]">
                  {group.tracks.map((t, i) => (
                    <li key={i} className="flex items-start justify-between gap-4 p-3.5">
                      <div className="min-w-0">
                        <p className="font-display text-sm uppercase tracking-wide text-white/90">
                          {t.href ? (
                            <Link
                              href={t.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:text-fuchsia-300"
                            >
                              {t.title} ↗
                            </Link>
                          ) : (
                            t.title
                          )}
                        </p>
                        <p className="text-xs text-white/55">{t.artist}</p>
                        {t.note && (
                          <p className="mt-1 text-xs italic text-white/40">{t.note}</p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Planning Checklist ──────────────────────────────────── */}
      <section className="border-t border-white/10 bg-zinc-950 px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <PlanningChecklist />
        </div>
      </section>

      <footer className="border-t border-white/10 px-6 py-10 text-center">
        <p className="font-display text-sm uppercase tracking-[0.3em] text-white/40">
          {d.groomName} &amp; {d.brideName} · {d.tagline}
        </p>
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.25em] text-white/25">
          A private page · not listed in the site nav
        </p>
      </footer>
    </main>
  );
}

function DetailCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <h3 className="font-mono text-[11px] uppercase tracking-[0.28em] text-fuchsia-200/80">
        {title}
      </h3>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function PartyRow({ role, name }: { role: string; name: string }) {
  return (
    <li className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/45">
        {role}
      </p>
      <p className="text-white/85">{name || "TBD"}</p>
    </li>
  );
}
