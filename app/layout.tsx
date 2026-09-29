import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { site } from "@/lib/site-config";
import TrackingProvider from "@/components/TrackingProvider";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: "Global Talent Lab — UK Global Talent Visa profile check for tech professionals", template: "%s · Global Talent Lab" },
  description:
    "Free 3-minute preliminary assessment for software engineers, AI & data professionals, tech leaders and founders considering the UK Global Talent route. Find your evidence gaps before spending months on an application.",
  openGraph: {
    title: "Check your UK Global Talent profile — free 3-minute assessment",
    description: "For software, AI, data, cyber and product professionals and tech founders. Identify your strongest evidence and your gaps.",
    url: site.url,
    siteName: site.name,
    type: "website",
    images: [{ url: "/img/founder.webp", width: 720, height: 1080 }],
  },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0b1f3a" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB" className={inter.variable}>
      <body>
        {children}
        <TrackingProvider />
      </body>
    </html>
  );
}
