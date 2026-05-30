'use client'

// Tabbed mini-app shell for the Food channel. Owns the active-tab
// state, renders MiniAppNav at the top, and swaps in the active
// panel below. Each panel is a self-contained feature component.

import MiniAppNav, { useTabFromUrl, type MiniAppTab } from '../../_components/MiniAppNav'
import RecipeParser from './RecipeParser'
import RestaurantFinder from './RestaurantFinder'
import IngredientFinder from './IngredientFinder'
import MyRecipes from './MyRecipes'
import ShoppingList from './ShoppingList'
import BackupPanel from './BackupPanel'

const TABS: MiniAppTab[] = [
  { id: 'recipes',   label: 'Recipes',  icon: '📋' },
  { id: 'eat-out',   label: 'Eat Out',  icon: '🍴' },
  { id: 'house',     label: 'In House', icon: '🏠' },
  { id: 'shopping',  label: 'Shopping', icon: '🛒' },
  { id: 'my',        label: 'My Stuff', icon: '★' },
]

const TAB_IDS = TABS.map((t) => t.id)

// Per-tab heading shown above the active panel. Keeps the "this is the
// X feature" framing without forcing each panel to render its own intro.
const TAB_INTRO: Record<string, { eyebrow: string; title: string; sub: string }> = {
  recipes: {
    eyebrow: 'RECIPES',
    title: 'Bring a recipe in. Scale it.',
    sub: 'Drop a URL from a recipe site, or paste raw text. We split out ingredients + steps and let you scale 1–4×.',
  },
  'eat-out': {
    eyebrow: "WHY DON'T YOU EAT OUT?",
    title: "Cooking's too much work today.",
    sub: 'Pick a cuisine, drop a zip (or use your exact location), open it in Google Maps. Save the places you went with a 10-star rating.',
  },
  house: {
    eyebrow: "WHAT'S IN THE HOUSE?",
    title: 'Cook from what you have.',
    sub: "Tap what's in your kitchen, mark anything to avoid, hit Find. Ranked by best match — perfect matches get a green border.",
  },
  shopping: {
    eyebrow: 'SHOPPING LIST',
    title: 'What to grab next time.',
    sub: 'Add items as you think of them, group by aisle, check off as you shop. Pull ingredients from any saved recipe in one tap.',
  },
  my: {
    eyebrow: 'MY RECIPES',
    title: 'Your saved favorites.',
    sub: 'Anything you save from the other tabs lives here. Rate them, tag them, search, scale + convert units on the fly.',
  },
}

export default function FoodApp() {
  const [tab, setTab] = useTabFromUrl('recipes', TAB_IDS)
  const intro = TAB_INTRO[tab] ?? TAB_INTRO.recipes

  return (
    <>
      <MiniAppNav tabs={TABS} activeTab={tab} onChange={setTab} color="red" />

      <section className="px-4 py-8 sm:px-6 sm:py-10">
        <div className="mx-auto max-w-3xl">
          <div className="mb-5">
            <p className="font-display text-[11px] tracking-[0.3em] text-red-400">
              ▌ {intro.eyebrow}
            </p>
            <h2 className="mt-2 font-display text-2xl tracking-wide sm:text-3xl">
              {intro.title}
            </h2>
            <p className="mt-2 text-sm text-white/65">{intro.sub}</p>
          </div>

          {tab === 'recipes'  && <RecipeParser />}
          {tab === 'eat-out'  && <RestaurantFinder />}
          {tab === 'house'    && <IngredientFinder />}
          {tab === 'shopping' && <ShoppingList />}
          {tab === 'my' && (
            <>
              <MyRecipes />
              <div className="mt-10">
                <BackupPanel />
              </div>
            </>
          )}
        </div>
      </section>
    </>
  )
}
