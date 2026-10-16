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

export const metadata: Metadata = {
  title: "genuicn",
  description:
    "Generative UI cards for your chatbot, installed with the shadcn CLI.",
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
