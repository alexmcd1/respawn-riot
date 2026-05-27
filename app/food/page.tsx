import type { Metadata } from "next";
import RecipeParser from "./_components/RecipeParser";
import RestaurantFinder from "./_components/RestaurantFinder";
import IngredientFinder from "./_components/IngredientFinder";
import MyRecipes from "./_components/MyRecipes";

export const metadata: Metadata = {
  title: "Food — Respawn Riot",
  description:
    "Parse a recipe from a URL or paste it in, scale ingredients, find restaurants, and discover recipes from what's in your fridge.",
};

export default function FoodPage() {
  return (
    <main className="bg-black text-white">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-red-500/30 scanlines">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(239,68,68,0.25),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(251,146,60,0.18),transparent_55%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-2 stripe-band" />

        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
          <p className="font-display text-xs tracking-[0.3em] text-red-400">
            ▌ CHANNEL 08
          </p>
          <h1 className="mt-3 font-display text-4xl tracking-[0.04em] sm:text-6xl">
            FOOD <span className="text-red-400">{"//"}</span> COOK OR GO OUT
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-white/75 sm:text-base">
            {"Paste a recipe, scale it 1–4×, find a restaurant nearby, or pick from what's in your fridge."}
          </p>

          {/* Section anchor nav — mobile-friendly */}
          <nav
            aria-label="Sections"
            className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4"
          >
            <a
              href="#parse"
              className="rounded-lg border border-red-400/40 bg-black/40 px-2 py-2.5 text-center font-display text-[11px] tracking-[0.2em] text-red-200 hover:bg-red-500/10 sm:text-xs"
            >
              📋 PARSE
            </a>
            <a
              href="#eat-out"
              className="rounded-lg border border-red-400/40 bg-black/40 px-2 py-2.5 text-center font-display text-[11px] tracking-[0.2em] text-red-200 hover:bg-red-500/10 sm:text-xs"
            >
              🍴 EAT OUT
            </a>
            <a
              href="#fridge"
              className="rounded-lg border border-red-400/40 bg-black/40 px-2 py-2.5 text-center font-display text-[11px] tracking-[0.2em] text-red-200 hover:bg-red-500/10 sm:text-xs"
            >
              🥘 FRIDGE
            </a>
            <a
              href="#my-recipes"
              className="rounded-lg border border-red-400/40 bg-black/40 px-2 py-2.5 text-center font-display text-[11px] tracking-[0.2em] text-red-200 hover:bg-red-500/10 sm:text-xs"
            >
              ★ MY RECIPES
            </a>
          </nav>
        </div>
      </section>

      {/* Section 1: Recipe parser */}
      <section
        id="parse"
        className="scroll-mt-24 border-b border-white/10 px-4 py-10 sm:px-6 sm:py-14"
      >
        <div className="mx-auto max-w-3xl">
          <div className="mb-5">
            <p className="font-display text-[11px] tracking-[0.3em] text-red-400">
              ▌ RECIPE PARSER
            </p>
            <h2 className="mt-2 font-display text-2xl tracking-wide sm:text-3xl">
              Bring a recipe in. Scale it.
            </h2>
            <p className="mt-2 text-sm text-white/65">
              Drop a URL from a recipe site, or paste raw text. We split out
              ingredients + steps and let you scale 1–4×.
            </p>
          </div>
          <RecipeParser />
        </div>
      </section>

      {/* Section 2: Restaurants */}
      <section
        id="eat-out"
        className="scroll-mt-24 border-b border-white/10 bg-zinc-950 px-4 py-10 sm:px-6 sm:py-14"
      >
        <div className="mx-auto max-w-3xl">
          <div className="mb-5">
            <p className="font-display text-[11px] tracking-[0.3em] text-red-400">
              ▌ WHY DON&apos;T YOU EAT OUT?
            </p>
            <h2 className="mt-2 font-display text-2xl tracking-wide sm:text-3xl">
              {"Cooking's too much work today."}
            </h2>
            <p className="mt-2 text-sm text-white/65">
              Pick a cuisine, drop a zip (or use your exact location), open it
              in Google Maps. Save the places you went with a 10-star rating.
            </p>
          </div>
          <RestaurantFinder />
        </div>
      </section>

      {/* Section 3: Fridge */}
      <section
        id="fridge"
        className="scroll-mt-24 px-4 py-10 sm:px-6 sm:py-14"
      >
        <div className="mx-auto max-w-3xl">
          <div className="mb-5">
            <p className="font-display text-[11px] tracking-[0.3em] text-red-400">
              ▌ WHAT&apos;S IN YOUR FRIDGE?
            </p>
            <h2 className="mt-2 font-display text-2xl tracking-wide sm:text-3xl">
              Check what you have. Find a recipe.
            </h2>
            <p className="mt-2 text-sm text-white/65">
              Tap any combination from the top-30 list, or add your own.
              We&apos;ll search TheMealDB for recipes that contain all of them.
            </p>
          </div>
          <IngredientFinder />
        </div>
      </section>

      {/* Section 4: My Recipes */}
      <section
        id="my-recipes"
        className="scroll-mt-24 border-t border-white/10 bg-zinc-950 px-4 py-10 sm:px-6 sm:py-14"
      >
        <div className="mx-auto max-w-3xl">
          <div className="mb-5">
            <p className="font-display text-[11px] tracking-[0.3em] text-red-400">
              ▌ MY RECIPES
            </p>
            <h2 className="mt-2 font-display text-2xl tracking-wide sm:text-3xl">
              Your saved favorites.
            </h2>
            <p className="mt-2 text-sm text-white/65">
              Anything you save from the sections above lives here. Rate them,
              tag them, search by name or ingredient, scale + convert units on
              the fly.
            </p>
          </div>
          <MyRecipes />
        </div>
      </section>

      <footer className="border-t border-white/10 px-6 py-8 text-center text-xs text-white/45">
        Recipe parsing reads schema.org/Recipe JSON-LD. Restaurant search uses
        OpenStreetMap. Recipe results via TheMealDB. Ratings + saved recipes
        stay in your browser&apos;s local storage.
      </footer>
    </main>
  );
}
