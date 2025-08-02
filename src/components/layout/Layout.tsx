
import React from 'react';
import Navbar from './Navbar';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: React.ReactNode;
  className?: string;
  hideNavbar?: boolean;
}

const Layout = ({ children, className, hideNavbar = false }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-warmbeige-50 to-warmpeach-50 overflow-hidden">
      <div className="absolute inset-0 bg-noise opacity-5 pointer-events-none"></div>
      <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-warmpeach-200/20 to-warmbeige-200/20 blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-full h-24 bg-gradient-to-l from-warmpeach-200/20 to-warmbeige-200/20 blur-3xl pointer-events-none"></div>
      
      <header className="absolute top-0 left-0 w-full py-4 px-6 frosted-glass z-10">
        <h1 className="text-xl font-semibold text-center text-warmgray-800">Вдохновение</h1>
      </header>
      
      <main className={cn(
        "max-w-md mx-auto px-4 pt-16 pb-24 min-h-screen",
        className
      )}>
        {children}
      </main>
      {!hideNavbar && <Navbar />}
    </div>
  );
};

export default Layout;
