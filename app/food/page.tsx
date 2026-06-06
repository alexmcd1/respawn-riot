import type { Metadata } from "next";
import { Suspense } from "react";
import FoodApp from "./_components/FoodApp";
import ChannelBanner from "../_components/ChannelBanner";

export const metadata: Metadata = {
  title: "Food — Respawn Riot",
  description:
    "Add a recipe and scale it up or down, turn it into a shopping list, cook from what's already in your fridge, or find a restaurant — all in one mini-app.",
};

export default function FoodPage() {
  return (
    <main className="bg-black text-white">
      <ChannelBanner
        src="/banners/food.png"
        alt="Food channel banner — Kid Ghost holding a slice in a punk diner"
      />
      {/* Hero — compact so the tabs land just below the fold on mobile */}
      <section className="relative overflow-hidden border-b border-red-500/30 scanlines">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(239,68,68,0.25),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(251,146,60,0.18),transparent_55%)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-2 stripe-band" />

        <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10">
          <p className="font-display text-xs tracking-[0.3em] text-red-400">
            ▌ CHANNEL 08
          </p>
          <h1 className="mt-2 font-display text-3xl tracking-[0.04em] sm:text-5xl">
            FOOD <span className="text-red-400">{"//"}</span> COOK OR GO OUT
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-white/75 sm:text-base">
            Add a recipe, scale it up or down, turn it into a shopping list,
            cook from what&apos;s already in the house, or just go find a
            restaurant — pick a tab.
          </p>
        </div>
      </section>

      {/* Tabbed mini-app. Wrapped in Suspense because useSearchParams
          inside FoodApp requires it during static rendering. */}
      <Suspense fallback={<TabsFallback />}>
        <FoodApp />
      </Suspense>

      <footer className="border-t border-white/10 px-6 py-8 text-center text-xs text-white/45">
        Restaurants via Google Places (OpenStreetMap fallback). Recipe search
        via Spoonacular (TheMealDB fallback). Recipe parsing reads
        schema.org/Recipe JSON-LD. Saved recipes, ratings, and the shopping
        list stay in your browser&apos;s local storage.
      </footer>
    </main>
  );
}

function TabsFallback() {
  return (
    <div className="h-16 border-b border-white/10 bg-black/85" aria-hidden />
  );
}
