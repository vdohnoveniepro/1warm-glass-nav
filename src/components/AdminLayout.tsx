'use client';

import React from 'react';
import { useAuth } from '@/lib/AuthContext';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const { user } = useAuth();

  // Если пользователь не авторизован, ничего не рендерим
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#EAE8E1]">
      {/* Основной контент */}
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
};

export default AdminLayout; 