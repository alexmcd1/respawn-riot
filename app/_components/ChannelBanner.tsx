import Image from "next/image";

// Wide horizontal Kid-Ghost-themed banner that sits at the very top of
// a channel page (below the global NavBar). Each channel page passes
// its own image path. The image is rendered through Next/Image so the
// ~3MB DALL-E PNGs get auto-resized + WebP-converted to sane sizes
// per viewport — important since these are page-header images that
// every visitor hits on cold load.
//
// Sizing strategy:
//   - mobile: 180px tall (banner-ish strip, doesn't dominate)
//   - sm:    240px
//   - md:    280px
//   - lg+:   320px
// All breakpoints use object-cover so the source 16:9 (1792×1024)
// crops cinematically — the mascot was prompted to sit in the left/
// center area so center-cover keeps him visible at every size.
//
// A subtle bottom-fade gradient blends the banner into the channel
// hero section below it.

export default function ChannelBanner({
  src,
  alt,
  /** Optional CSS object-position. Defaults to "center"; pass e.g.
   *  "30% 50%" to nudge the crop toward the mascot when needed. */
  position = "center",
}: {
  src: string;
  alt: string;
  position?: string;
}) {
  return (
    <section
      aria-hidden="false"
      className="relative w-full overflow-hidden border-b border-white/10 bg-black"
    >
      <Image
        src={src}
        alt={alt}
        width={1792}
        height={1024}
        priority
        sizes="100vw"
        className="block h-[180px] w-full object-cover sm:h-[240px] md:h-[280px] lg:h-[320px]"
        style={{ objectPosition: position }}
      />
      {/* Bottom fade — blends the banner into the channel hero below
          so there's no hard seam between art and page content. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-b from-transparent via-black/40 to-black" />
    </section>
  );
}
