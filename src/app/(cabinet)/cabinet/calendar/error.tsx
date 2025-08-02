'use client';

import React from 'react';

export default function CalendarError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Ошибка загрузки календаря</h1>
        <p className="text-gray-600 mb-6">
          Произошла ошибка при загрузке календаря. Пожалуйста, попробуйте перезагрузить страницу.
        </p>
        <button 
          onClick={() => reset()}
          className="inline-block px-4 py-2 bg-[#48a9a6] text-white rounded-md hover:bg-[#3a8a87] transition-colors"
        >
          Попробовать снова
        </button>
      </div>
    </div>
  );
} 