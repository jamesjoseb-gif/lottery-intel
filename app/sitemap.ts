import type { MetadataRoute } from "next";

const baseUrl = "https://lottery-intel.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const routes = [
    { path: "/", priority: 1.0, changeFrequency: "daily" as const },
    { path: "/live", priority: 1.0, changeFrequency: "daily" as const },
    { path: "/4d", priority: 0.95, changeFrequency: "daily" as const },
    { path: "/4d/strategy", priority: 0.9, changeFrequency: "weekly" as const },
    { path: "/toto", priority: 0.95, changeFrequency: "daily" as const },
    { path: "/toto/analyse", priority: 0.9, changeFrequency: "weekly" as const },
    { path: "/singapore-sweep", priority: 0.8, changeFrequency: "monthly" as const },
    { path: "/about", priority: 0.55, changeFrequency: "monthly" as const },
    { path: "/how-it-works", priority: 0.65, changeFrequency: "monthly" as const },
    { path: "/contact", priority: 0.45, changeFrequency: "monthly" as const },
  ];

  return routes.map((route) => ({ url: `${baseUrl}${route.path}`, lastModified: now, changeFrequency: route.changeFrequency, priority: route.priority }));
}
