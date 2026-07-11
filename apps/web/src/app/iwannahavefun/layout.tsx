import type { Metadata, Viewport } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://monosyth.com";

export const metadata: Metadata = {
  title: "I Wanna Have Fun!",
  description: "A funny memory, made for the party.",
  alternates: {
    canonical: `${siteUrl}/iwannahavefun`,
  },
  robots: {
    index: false,
    follow: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ff2d95",
};

export default function IWantToHaveFunLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
