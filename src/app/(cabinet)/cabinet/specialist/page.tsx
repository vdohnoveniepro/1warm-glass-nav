import { Suspense } from 'react';
import { FaSpinner } from 'react-icons/fa';
import SpecialistClient from './SpecialistClient';

export default function SpecialistCabinet() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <FaSpinner className="animate-spin text-teal-500 text-4xl mx-auto mb-4" />
          <p className="text-gray-600">Загрузка данных...</p>
        </div>
      </div>
    }>
      <SpecialistClient />
    </Suspense>
  );
}