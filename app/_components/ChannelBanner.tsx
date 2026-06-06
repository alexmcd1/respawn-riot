import Image from "next/image";

// Wide horizontal Kid-Ghost-themed banner that sits at the very top of
// a channel page (below the global NavBar). Each channel page passes
// its own image path. The image is rendered through Next/Image so the
// ~3MB DALL-E PNGs get auto-resized + WebP-converted to sane sizes
// per viewport — important since these are page-header images that
// every visitor hits on cold load.
//
// Sizing strategy:
//   - mobile: 200px tall (slim banner strip)
//   - sm:    260px
//   - md:    320px
//   - lg:    400px
//   - xl:    460px
// All breakpoints use object-cover so the source 16:9 (1792×1024)
// crops to fit. Default object-position is biased toward the top
// ("50% 22%") because the generated mascot images all place Kid
// Ghost's head in the upper portion of the frame, and a centered
// crop on a wide-and-short banner chops his head off. Override with
// the `position` prop on a per-page basis if a particular banner
// needs different framing.
//
// A subtle bottom-fade gradient blends the banner into the channel
// hero section below it.

export default function ChannelBanner({
  src,
  alt,
  /** CSS object-position. Defaults to "50% 22%" (top-biased) which
   *  keeps the mascot's head in frame for the four generated banners.
   *  Override per page if a specific image needs different framing —
   *  e.g. position="50% 10%" for an image where the head is near
   *  the top edge, or position="center" for a centered subject. */
  position = "50% 22%",
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
        className="block h-[200px] w-full object-cover sm:h-[260px] md:h-[320px] lg:h-[400px] xl:h-[460px]"
        style={{ objectPosition: position }}
      />
      {/* Bottom fade — blends the banner into the channel hero below
          so there's no hard seam between art and page content. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent via-black/30 to-black" />
    </section>
  );
}
