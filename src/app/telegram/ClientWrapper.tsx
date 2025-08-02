'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Динамический импорт клиентского компонента
const TelegramAppClient = dynamic(() => import('./TelegramAppClient'), { 
  ssr: false,
  loading: () => (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#0088cc] border-r-2"></div>
      <p className="mt-4 text-gray-600">Загрузка...</p>
    </div>
  )
});

export default function ClientWrapper() {
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  if (!isMounted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#0088cc] border-r-2"></div>
        <p className="mt-4 text-gray-600">Загрузка...</p>
      </div>
    );
  }
  
  return <TelegramAppClient />;
} 