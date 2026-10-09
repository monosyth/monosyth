import type { NextConfig } from "next";

// App Hosting forwards the visitor's domain in X-Forwarded-Host; direct
// local requests use Host. Match either so the same routes work in both places.
function domainMatches(domain: string) {
  return [
    { type: "host" as const, value: domain },
    { type: "header" as const, key: "x-forwarded-host", value: domain },
  ];
}

const nextConfig: NextConfig = {
  async redirects() {
    return domainMatches("www\\.vtmultifamily\\.com").map(match => ({
      source: "/:path*",
      has: [match],
      destination: "https://vtmultifamily.com/:path*",
      permanent: true,
    }));
  },
  async rewrites() {
    return {
      beforeFiles: [
        // Keep Vermont requests out of Monosyth's app/API routes. Already
        // namespaced assets pass through without receiving a second prefix.
        ...domainMatches("vtmultifamily\\.com").map(match => ({
          source: "/:path((?!vtmultifamily(?:/|$)).+)",
          has: [match],
          destination: "/vtmultifamily/:path",
        })),
        ...domainMatches("vtmultifamily\\.com").map(match => ({
          source: "/",
          has: [match],
          destination: "/vtmultifamily/index.html",
        })),
        {
          source: "/vtmultifamily",
          destination: "/vtmultifamily/index.html",
        },
        {
          source: "/vtmultifamily/michellehebert",
          destination: "/vtmultifamily/michellehebert/index.html",
        },
      ],
    };
  },
  async headers() {
    return [{
      source: "/dallas-and-scott/:path*",
      headers: [
        { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive, noimageindex" },
        { key: "Referrer-Policy", value: "no-referrer" },
      ],
    }, {
      source: "/shop/order",
      headers: [
        { key: "Cache-Control", value: "private, no-store, max-age=0" },
        { key: "Referrer-Policy", value: "no-referrer" },
        { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
      ],
    }];
  },
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
