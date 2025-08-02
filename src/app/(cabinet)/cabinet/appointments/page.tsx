'use client';
export const dynamic = 'force-dynamic'

import { Suspense } from 'react';
import AppointmentsClient from './AppointmentsClient';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function AppointmentsPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center py-20">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Загрузка записей...</p>
        </div>
      </div>
    }>
      <AppointmentsClient />
    </Suspense>
  );
}