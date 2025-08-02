import React, { Suspense } from 'react';
import { FaCalendarCheck } from 'react-icons/fa';
import { Metadata } from 'next';
import ThankYouClient from './ThankYouClient';

export const metadata: Metadata = {
  title: 'Спасибо за вашу запись | Вдохновение',
  description: 'Благодарим за запись в центр развития личности "Вдохновение"'
};

export default function ThankYouPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto py-16 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="flex justify-center mb-8">
            <div className="bg-green-100 rounded-full p-6 inline-flex">
              <FaCalendarCheck className="text-5xl text-green-600" />
            </div>
          </div>
          
          <h1 className="text-3xl md:text-4xl font-bold mb-6 text-gray-900 dark:text-white">
            Загрузка...
          </h1>
          
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    }>
      <ThankYouClient />
    </Suspense>
  );
} 