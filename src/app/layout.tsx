import type { Metadata, Viewport } from 'next';
import './globals.css';
import { designStyle, getCurrentDesignSettings } from '@/lib/design/settings';


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

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const design = await getCurrentDesignSettings();

  return (
    <html lang="en">
      <body className={`font-sans antialiased theme-${design.theme_mode}`} style={designStyle(design)}>{children}</body>
    </html>
  );
}
