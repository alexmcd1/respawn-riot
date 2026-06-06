// BoardGameGeek "hot games" fetcher.
//
// BGG publishes their currently-hot top-50 board games via a free,
// no-auth XML endpoint at xmlapi2/hot?type=boardgame. Used by the
// /games "Currently Hot" panel to surface what tabletop players are
// actually playing right now. Same endpoint also covers TCGs since
// BGG categorizes Magic, Pokémon, Yu-Gi-Oh, etc. as board games for
// the purposes of the hot list.

const BGG_HOT_URL = "https://boardgamegeek.com/xmlapi2/hot?type=boardgame";
const CACHE_SECONDS = 60 * 60 * 4; // 4h — the BGG hot list moves slowly

export type BggHotGame = {
  id: string;
  rank: number;
  name: string;
  yearPublished?: number;
  thumbnail?: string;
  /** Direct link to the BGG game page. */
  url: string;
};

// BGG's response is XML — small and predictable enough that a few
// regexes are a much smaller dependency than pulling in xml2js.
//
// Shape of each <item>:
//   <item id="224517" rank="1">
//     <thumbnail value="https://..."/>
//     <name value="Brass: Birmingham"/>
//     <yearpublished value="2018"/>
//   </item>
function parseBggHot(xml: string): BggHotGame[] {
  const items: BggHotGame[] = [];
  const itemRe = /<item\b([^>]*)>([\s\S]*?)<\/item>/g;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(xml)) !== null) {
    const attrs = m[1];
    const body = m[2];
    const id = attrs.match(/\bid="(\d+)"/)?.[1];
    const rank = parseInt(attrs.match(/\brank="(\d+)"/)?.[1] ?? "0", 10);
    if (!id || !rank) continue;
    const name = body.match(/<name\s+value="([^"]+)"/)?.[1];
    if (!name) continue;
    const thumbnail = body.match(/<thumbnail\s+value="([^"]+)"/)?.[1];
    const yearRaw = body.match(/<yearpublished\s+value="(\d+)"/)?.[1];
    items.push({
      id,
      rank,
      name: name.replace(/&amp;/g, "&"),
      thumbnail,
      yearPublished: yearRaw ? parseInt(yearRaw, 10) : undefined,
      url: `https://boardgamegeek.com/boardgame/${id}`,
    });
  }
  return items.sort((a, b) => a.rank - b.rank);
}

export async function fetchBggHot(limit = 8): Promise<BggHotGame[]> {
  try {
    const res = await fetch(BGG_HOT_URL, {
      next: { revalidate: CACHE_SECONDS },
      headers: { accept: "application/xml" },
    });
    if (!res.ok) {
      console.warn(`[bgg] HTTP ${res.status}`);
      return [];
    }
    const xml = await res.text();
    return parseBggHot(xml).slice(0, limit);
  } catch (err) {
    console.warn("[bgg] fetch threw:", err);
    return [];
  }
}
