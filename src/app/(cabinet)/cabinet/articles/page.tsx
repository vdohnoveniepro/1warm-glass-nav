import { Suspense } from 'react';
import { FaSpinner } from 'react-icons/fa';
import ArticlesClient from './ArticlesClient';

export const dynamic = 'force-dynamic';

export default function ArticlesPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center p-10 min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#48a9a6]"></div>
        <p className="ml-3 text-gray-600">Загрузка...</p>
      </div>
    }>
      <ArticlesClient />
    </Suspense>
  );
} 