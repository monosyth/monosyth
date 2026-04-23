import type { Metadata } from "next";
import {
  Bebas_Neue,
  IBM_Plex_Mono,
  Playfair_Display,
  Space_Grotesk,
} from "next/font/google";

import { AuthProvider } from "@/components/auth/auth-provider";

import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
});

const bebasNeue = Bebas_Neue({
  variable: "--font-bebas-neue",
  subsets: ["latin"],
  weight: ["400"],
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://monosyth.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Monosyth",
  description: "Monosyth.",
  openGraph: {
    title: "Monosyth",
    description: "Monosyth.",
    url: siteUrl,
    siteName: "Monosyth",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Monosyth",
    description: "Monosyth.",
  },
};

const bodyClassName = `${spaceGrotesk.variable} ${ibmPlexMono.variable} ${playfairDisplay.variable} ${bebasNeue.variable} min-h-full`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className={bodyClassName}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
