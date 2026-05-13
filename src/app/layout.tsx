import type { Metadata, Viewport } from 'next';
import './globals.css';


export const metadata: Metadata = {
  title: {
    default: 'OurStory',
    template: '%s | OurStory'
  },
  description: 'A private, playful relationship app for couples to connect through stories, questions, and date games.',
  applicationName: 'OurStory',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'OurStory'
  }
};

export const viewport: Viewport = {
  themeColor: '#f43f5e',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
