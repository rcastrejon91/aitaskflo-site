import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AuthSessionProvider from "@/components/AuthSessionProvider";
import { ThemeProvider } from "@/components/theme-provider";
import MaintenanceBanner from "@/components/MaintenanceBanner";

const inter = Inter({ subsets: ["latin"] });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aitaskflo.com";

export const metadata: Metadata = {
  title: {
    default: "Lyra — AI That Actually Learns How to Help You",
    template: "%s | Lyra by AITaskFlo",
  },
  description: "Lyra is a self-improving AI that remembers your context, reflects on every conversation, and gets more useful the more you use it. Start free.",
  metadataBase: new URL(siteUrl),
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  keywords: ["AI assistant", "self-improving AI", "persistent memory AI", "Lyra AI", "AITaskFlo", "AI chat", "AI productivity"],
  authors: [{ name: "AITaskFlo" }],
  creator: "AITaskFlo",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "Lyra by AITaskFlo",
    title: "Lyra — AI That Actually Learns How to Help You",
    description: "Self-improving AI with persistent memory, reflection engine, and agent evolution. Start free.",
    images: [{ url: `${siteUrl}/og.png`, width: 1200, height: 630, alt: "Lyra by AITaskFlo" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Lyra — AI That Actually Learns How to Help You",
    description: "Self-improving AI with persistent memory. Start free.",
    images: [`${siteUrl}/og.png`],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <MaintenanceBanner />
          <AuthSessionProvider>{children}</AuthSessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
