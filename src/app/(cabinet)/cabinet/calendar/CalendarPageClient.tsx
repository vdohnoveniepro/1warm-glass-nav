'use client';

import React, { Suspense } from 'react';
import CalendarContent from './CalendarContent';

// Улучшенный компонент-индикатор загрузки
function LoadingSpinner() {
  return (
    <div className="flex flex-col justify-center items-center min-h-[60vh]">
      <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-[#48a9a6] border-r-2"></div>
      <p className="mt-4 text-gray-600">Загрузка календаря...</p>
    </div>
  );
}

// Компонент-обертка с Suspense boundary
export default function CalendarPageClient() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <CalendarContent />
    </Suspense>
  );
}