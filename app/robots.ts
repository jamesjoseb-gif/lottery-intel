import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/toto/history"],
    },
    sitemap: "https://lottery-intel.com/sitemap.xml",
    host: "https://lottery-intel.com",
  };
}
