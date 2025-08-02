'use client';

import React from 'react';
import Link from 'next/link';

export default function CalendarNotFound() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Страница календаря недоступна</h1>
        <p className="text-gray-600 mb-6">
          К сожалению, страница календаря временно недоступна. Мы работаем над её восстановлением.
        </p>
        <Link 
          href="/cabinet"
          className="inline-block px-4 py-2 bg-[#48a9a6] text-white rounded-md hover:bg-[#3a8a87] transition-colors"
        >
          Вернуться в кабинет
        </Link>
      </div>
    </div>
  );
} 