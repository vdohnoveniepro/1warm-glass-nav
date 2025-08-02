import { Suspense } from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';
import BlogPageClient from './BlogPageClient';

export default function BlogPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center py-20">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Загрузка блога...</p>
        </div>
      </div>
    }>
      <BlogPageClient />
    </Suspense>
  );
} 