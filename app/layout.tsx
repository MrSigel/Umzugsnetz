import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import LiveChatWidget from "@/components/LiveChatWidget";
import CookieBanner from "@/components/CookieBanner";
import { ToastProvider } from "@/components/ToastProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Umzugsnetz – Umzug & Entrümpelung vergleichen",
  description: "Vergleichen Sie kostenlos Angebote geprüfter Umzugs- und Entrümpelungsunternehmen aus Ihrer Region. Über 6.000 Anfragen deutschlandweit.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="de"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ToastProvider>
          {children}
          <LiveChatWidget />
          <CookieBanner />
        </ToastProvider>
      </body>
    </html>
  );
}
