'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export default function CalendarContent() {
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
  
  // Эффект для имитации загрузки данных
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);
  
  if (isLoading) {
    return (
      <div className="w-full flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#48a9a6] border-r-2"></div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-4">Календарь записей</h1>
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-center text-gray-500 mb-4">
          Выбранная дата: {date}
        </p>
        <p className="text-center text-gray-500">
          Календарь временно недоступен. Работаем над восстановлением функциональности.
        </p>
      </div>
    </div>
  );
}