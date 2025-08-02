import { Suspense } from 'react';
import { FaSpinner } from 'react-icons/fa';
import { Metadata } from 'next';
import dynamic from 'next/dynamic';

// Импортируем клиентский компонент с использованием dynamic import
const SpecialistsClient = dynamic(() => import('./SpecialistsClient'), {
  loading: () => (
    <div className="flex justify-center items-center py-12">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#48a9a6]"></div>
      <p className="ml-3 text-gray-600">Загрузка данных...</p>
    </div>
  )
});

export const metadata: Metadata = {
  title: 'Управление специалистами | Вдохновение',
  description: 'Панель управления специалистами центра развития личности "Вдохновение"'
};

export default function SpecialistsPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#48a9a6]"></div>
        <p className="ml-3 text-gray-600">Загрузка данных...</p>
      </div>
    }>
      <SpecialistsClient />
    </Suspense>
  );
}
