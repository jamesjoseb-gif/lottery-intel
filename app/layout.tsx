import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  metadataBase: new URL("https://lottery-intel.com"),
  title: {
    default: "Singapore 4D & TOTO Results, Statistics & AI Research | Lottery Intel",
    template: "%s | Lottery Intel",
  },
  description:
    "Check Singapore 4D, TOTO and Singapore Sweep results and research numbers using historical statistics, relationship analysis and budget-aware tools.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_SG",
    siteName: "Lottery Intel",
    title: "Singapore 4D & TOTO Results, Statistics & AI Research",
    description: "Singapore lottery results and independent historical research for 4D, TOTO and Singapore Sweep.",
    url: "https://lottery-intel.com",
  },
  twitter: {
    card: "summary_large_image",
    title: "Singapore 4D & TOTO Results, Statistics & AI Research",
    description: "Check Singapore results and research your next 4D or TOTO selection with historical data.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  },
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-SG">
      <body>
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
