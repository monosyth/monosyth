import type { MetadataRoute } from "next";
import { shopProducts } from "@/lib/shop/catalog";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://monosyth.com";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${siteUrl}/shop`, changeFrequency: "weekly", priority: 0.8 },
    ...shopProducts.map((product) => ({ url: `${siteUrl}/shop/${product.slug}`, changeFrequency: "monthly" as const, priority: 0.6 })),
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteUrl}/move`,
      lastModified: new Date("2026-09-11"),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/processvision`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];
}
