import type { Metadata, Viewport } from "next";

import "./kitchen.css";

export const metadata: Metadata = {
  title: "Dallas's Kitchen",
  description: "Paste a recipe link, skip the life story, plan the week, and get one shopping list.",
  manifest: "/kitchen/manifest.webmanifest",
  icons: { icon: "/kitchen/icon.svg", apple: "/kitchen/apple-icon.png" },
  appleWebApp: { capable: true, title: "Kitchen", statusBarStyle: "default" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#fbf7f0",
};

export default function KitchenLayout({ children }: { children: React.ReactNode }) {
  return <div className="dk">{children}</div>;
}
