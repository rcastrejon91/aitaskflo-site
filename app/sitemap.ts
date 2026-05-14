import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aitaskflo.com";
  const now = new Date();

  return [
    // Core
    { url: siteUrl,                      lastModified: now, changeFrequency: "weekly",  priority: 1.0 },
    { url: `${siteUrl}/pricing`,         lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${siteUrl}/login`,           lastModified: now, changeFrequency: "yearly",  priority: 0.6 },
    // Marketing / public
    { url: `${siteUrl}/agency`,          lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${siteUrl}/investors`,       lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${siteUrl}/careers`,         lastModified: now, changeFrequency: "weekly",  priority: 0.6 },
    // Features / demos (publicly accessible)
    { url: `${siteUrl}/demo`,            lastModified: now, changeFrequency: "weekly",  priority: 0.8 },
    { url: `${siteUrl}/feed`,            lastModified: now, changeFrequency: "daily",   priority: 0.7 },
    { url: `${siteUrl}/games`,           lastModified: now, changeFrequency: "daily",   priority: 0.7 },
    { url: `${siteUrl}/book`,            lastModified: now, changeFrequency: "weekly",  priority: 0.6 },
    { url: `${siteUrl}/biz`,             lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${siteUrl}/social`,          lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/shop`,            lastModified: now, changeFrequency: "weekly",  priority: 0.5 },
    // Support / legal
    { url: `${siteUrl}/support`,         lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${siteUrl}/privacy`,         lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
    { url: `${siteUrl}/terms`,           lastModified: now, changeFrequency: "yearly",  priority: 0.3 },
  ];
}
