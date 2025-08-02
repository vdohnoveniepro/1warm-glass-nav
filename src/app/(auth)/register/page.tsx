import { Suspense } from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';
import RegisterPageClient from './RegisterPageClient';

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center py-20">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Загрузка формы регистрации...</p>
        </div>
      </div>
    }>
      <RegisterPageClient />
    </Suspense>
  );
} 