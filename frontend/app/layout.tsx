import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Order Dashboard',
  description: 'Black and white order management dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning className="min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-white">{children}</body>
    </html>
  );
}
