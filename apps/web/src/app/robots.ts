import type { MetadataRoute } from "next";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://monosyth.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/shop/order", "/api/shop/", "/kitchen", "/api/kitchen/"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
