import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import ToastProvider from '@/components/ToastProvider';
import AuthSessionProvider from '@/components/AuthSessionProvider';

export const metadata: Metadata = {
  title: 'Job Radar — Intelligent Job Monitoring Dashboard',
  description: 'Automatically scan, aggregate, score, and track job opportunities across multiple sources with AI-powered relevance matching.',
  keywords: ['job search', 'job board', 'job radar', 'career', 'job monitoring'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <AuthSessionProvider>
          <ToastProvider>
            <div className="app-shell">
              <Sidebar />
              <MobileNav />
              <main className="main-content">
                {children}
              </main>
            </div>
          </ToastProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
