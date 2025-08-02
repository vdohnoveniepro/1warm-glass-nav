import { Suspense } from 'react';
import ReviewsClient from './ReviewsClient';

export default function ReviewsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-5xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-600">Загрузка отзывов...</p>
          </div>
        </div>
      </div>
    }>
      <ReviewsClient />
    </Suspense>
  );
} 