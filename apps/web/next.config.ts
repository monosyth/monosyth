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
        // VT pages now publish independently to Firebase Hosting. These
        // external rewrites keep the Monosyth folder URLs stable.
        {
          source: "/vtmultifamily",
          destination: "https://vtmultifamily-monosyth.firebaseapp.com/",
        },
        {
          source: "/vtmultifamily/michellehebert",
          destination: "https://vtmultifamily-monosyth.firebaseapp.com/michellehebert",
        },
        {
          source: "/vtmultifamily/:path*",
          destination: "https://vtmultifamily-monosyth.firebaseapp.com/vtmultifamily/:path*",
        },
        // Until the custom domain moves directly to Hosting, proxy its
        // existing App Hosting entry point to the same independent site.
        ...domainMatches("vtmultifamily\\.com").map(match => ({
          source: "/michellehebert",
          has: [match],
          destination: "https://vtmultifamily-monosyth.firebaseapp.com/michellehebert",
        })),
        ...domainMatches("vtmultifamily\\.com").map(match => ({
          source: "/:path((?!vtmultifamily(?:/|$)).+)",
          has: [match],
          destination: "https://vtmultifamily-monosyth.firebaseapp.com/vtmultifamily/:path",
        })),
        ...domainMatches("vtmultifamily\\.com").map(match => ({
          source: "/",
          has: [match],
          destination: "https://vtmultifamily-monosyth.firebaseapp.com/",
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
