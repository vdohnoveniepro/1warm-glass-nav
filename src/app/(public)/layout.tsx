'use client';

import BottomNav from '@/components/BottomNav';
import TelegramRefHandler from '@/components/TelegramRefHandler'; 
import '../globals.css';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen pb-24 sm:pb-20 overflow-hidden">
      <TelegramRefHandler />
      <main className="container mx-auto px-2 sm:px-4 py-4">
        {children}
      </main>
      <BottomNav />
    </div>
  );
} 