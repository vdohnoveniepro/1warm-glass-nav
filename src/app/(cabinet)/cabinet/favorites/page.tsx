import { Suspense } from 'react';
import { SearchParamsProvider } from '@/lib/hooks/useSearchParamsWrapper';
import FavoritesClient from './FavoritesClient';

export const dynamic = 'force-dynamic';

export default function FavoritesPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#48a9a6] border-r-2"></div>
      </div>
    }>
      <SearchParamsProvider>
        <FavoritesClient />
      </SearchParamsProvider>
    </Suspense>
  );
} 