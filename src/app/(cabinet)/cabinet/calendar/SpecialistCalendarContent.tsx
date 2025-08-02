'use client';

import React, { useEffect, useState } from 'react';

export default function SpecialistCalendarContent() {
  const [isClient, setIsClient] = useState(false);

  // Используем useEffect для определения, что компонент выполняется на клиенте
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Если компонент еще не на клиенте, показываем загрузку
  if (!isClient) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#48a9a6] border-r-2"></div>
          </div>
          <p className="text-center text-gray-500 mt-4">Загрузка календаря...</p>
        </div>
      </div>
    );
  }

  // На клиенте отображаем заглушку, которую позже заменим на полный контент
  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-4">Календарь записей</h1>
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-center text-gray-500">
          Календарь временно недоступен. Работаем над восстановлением функциональности.
        </p>
      </div>
    </div>
  );
} 