import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Nexora — Order & Invoice Operations',
  description: 'Unified order fulfillment, invoice OCR, and role-based access control.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Nexora',
  },
};

export const viewport = {
  themeColor: '#0a0a0a',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className="overflow-x-hidden">
      <body suppressHydrationWarning className="min-h-screen overflow-x-hidden bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-white">{children}</body>
    </html>
  );
}
