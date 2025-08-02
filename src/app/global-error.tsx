'use client';

import { useEffect } from 'react';
import Link from 'next/link';
 
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Логирование критической ошибки
    console.error('Глобальная ошибка приложения:', error);
  }, [error]);
 
  return (
    <html lang="ru">
      <body>
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
          <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md text-center">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Критическая ошибка</h2>
            <p className="text-gray-700 mb-6">
              Приложение не может быть загружено из-за критической ошибки. Пожалуйста, попробуйте обновить страницу.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button
                onClick={reset}
                className="px-4 py-2 bg-[#48a9a6] text-white rounded-md hover:bg-[#3a8a87] transition-colors"
              >
                Попробовать снова
              </button>
              <Link
                href="/"
                className="px-4 py-2 border border-[#48a9a6] text-[#48a9a6] rounded-md hover:bg-[#e6f5f4] transition-colors"
              >
                Вернуться на главную
              </Link>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}