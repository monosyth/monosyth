import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [{
      source: "/:path*",
      has: [{ type: "host", value: "www\\.vtmultifamily\\.com" }],
      destination: "https://vtmultifamily.com/:path*",
      permanent: true,
    }];
  },
  async rewrites() {
    return {
      beforeFiles: [
        // Keep Vermont requests out of Monosyth's app/API routes. Already
        // namespaced assets pass through without receiving a second prefix.
        {
          source: "/:path((?!vtmultifamily(?:/|$)).+)",
          has: [{ type: "host", value: "vtmultifamily\\.com" }],
          destination: "/vtmultifamily/:path",
        },
        {
          source: "/",
          has: [{ type: "host", value: "vtmultifamily\\.com" }],
          destination: "/vtmultifamily/index.html",
        },
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
