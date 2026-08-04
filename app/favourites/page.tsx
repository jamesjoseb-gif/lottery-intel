import type { Metadata } from "next";
import { FavouritesList } from "@/components/FavouritesList";

export const metadata: Metadata = {
  title: "Favourite 4D Numbers",
  description: "Review the historical activity of your saved Singapore 4D numbers.",
  robots: { index: false, follow: false },
};

export default function FavouritesPage() {
  return <main className="container page-shell favourites-page">
    <span className="eyebrow">Your saved numbers</span>
    <h1>Favourite 4D Numbers</h1>
    <p className="section-copy">Compare the verified historical activity of the numbers you saved on this device.</p>
    <p className="notice">Favourites and historical activity do not predict future results. Lottery draws are games of chance.</p>
    <FavouritesList />
  </main>;
}
