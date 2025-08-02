import { Suspense } from 'react';
import { FaSpinner } from 'react-icons/fa';
import { Metadata } from 'next';
import dynamic from 'next/dynamic';

// Импортируем клиентский компонент с использованием dynamic import
const SettingsClient = dynamic(() => import('./SettingsClient'), {
  loading: () => (
    <div className="max-w-2xl mx-auto p-4">
      <div className="flex justify-center my-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#48a9a6] border-r-2"></div>
        <p className="ml-3 text-gray-600">Загрузка настроек...</p>
      </div>
    </div>
  )
});

export const metadata: Metadata = {
  title: 'Настройки профиля | Вдохновение',
  description: 'Управление настройками профиля в личном кабинете центра развития личности "Вдохновение"'
};

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="max-w-2xl mx-auto p-4">
        <div className="flex justify-center my-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#48a9a6] border-r-2"></div>
          <p className="ml-3 text-gray-600">Загрузка настроек...</p>
        </div>
      </div>
    }>
      <SettingsClient />
    </Suspense>
  );
} 