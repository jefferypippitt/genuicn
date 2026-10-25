import { Geist_Mono, Inter } from "next/font/google";
import { Providers } from "@/components/providers";
import { SiteShell } from "@/components/site-shell";
import { latestNewHrefs } from "@/lib/changelog/load";
import type { Metadata } from "next";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  axes: ["opsz"],
  variable: "--font-inter",
});
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

const DESCRIPTION =
  "Generative UI cards for your chatbot, installed with the shadcn CLI.";

/**
The site's address for the share image's absolute URL: Vercel sets the production domain at build time, and local builds use localhost.
*/
const SITE_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

const SHARE_IMAGE = {
  alt: "genuicn",
  height: 630,
  url: "/opengraph-image.png",
  width: 1200,
};

export const metadata: Metadata = {
  description: DESCRIPTION,
  icons: {
    apple: "/apple-touch-icon.png",
    icon: [
      { sizes: "any", url: "/favicon.ico" },
      { sizes: "16x16", type: "image/png", url: "/favicon-16x16.png" },
      { sizes: "32x32", type: "image/png", url: "/favicon-32x32.png" },
    ],
  },
  manifest: "/site.webmanifest",
  // URL.parse returns null for a malformed address instead of throwing.
  metadataBase: URL.parse(SITE_URL),
  openGraph: {
    description: DESCRIPTION,
    images: [SHARE_IMAGE],
    siteName: "genuicn",
    title: "genuicn",
    type: "website",
  },
  title: "genuicn",
  twitter: {
    card: "summary_large_image",
    description: DESCRIPTION,
    images: [SHARE_IMAGE],
    title: "genuicn",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${mono.variable} font-sans antialiased`}
    >
      <body>
        <Providers>
          <SiteShell newHrefs={latestNewHrefs()}>{children}</SiteShell>
        </Providers>
      </body>
    </html>
  );
}
