import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import ToastProvider from '@/components/ToastProvider';

export const metadata: Metadata = {
  title: 'Job Radar — Intelligent Job Monitoring Dashboard',
  description: 'Automatically scan, aggregate, score, and track job opportunities across multiple sources with AI-powered relevance matching.',
  keywords: ['job search', 'job board', 'job radar', 'career', 'job monitoring'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ToastProvider>
          <div className="app-shell">
            <Sidebar />
            <main className="main-content">
              {children}
            </main>
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}
