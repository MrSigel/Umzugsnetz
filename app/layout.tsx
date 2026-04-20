import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import LiveChatWidget from '@/components/LiveChatWidget';
import CookieBanner from '@/components/CookieBanner';
import { ToastProvider } from '@/components/ToastProvider';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://umzugsnetz.de'),
  title: 'Umzugsnetz - Umzug und Entrümpelung vergleichen',
  description:
    'Vergleichen Sie kostenlos Angebote geprüfter Umzugs- und Entrümpelungsunternehmen aus Ihrer Region. Über 6.000 Kundenanfragen deutschlandweit.',
  alternates: {
    canonical: 'https://umzugsnetz.de',
  },
  openGraph: {
    title: 'Umzugsnetz - Umzug und Entrümpelung vergleichen',
    description:
      'Kostenlos passende Angebote geprüfter Umzugs- und Entrümpelungsunternehmen vergleichen.',
    url: 'https://umzugsnetz.de',
    siteName: 'Umzugsnetz',
    locale: 'de_DE',
    type: 'website',
    images: [
      {
        url: '/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'Umzugsnetz - Umzug und Entrümpelung vergleichen',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Umzugsnetz - Umzug und Entrümpelung vergleichen',
    description:
      'Kostenlos passende Angebote geprüfter Umzugs- und Entrümpelungsunternehmen vergleichen.',
    images: ['/twitter-image'],
  },
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
      <body className="min-h-full flex flex-col overflow-x-hidden">
        <ToastProvider>
          {children}
          <LiveChatWidget />
          <CookieBanner />
        </ToastProvider>
      </body>
    </html>
  );
}
