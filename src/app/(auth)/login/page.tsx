import { Suspense } from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';
import LoginPageClient from './LoginPageClient';

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center py-20">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Загрузка формы входа...</p>
        </div>
      </div>
    }>
      <LoginPageClient />
    </Suspense>
  );
} 