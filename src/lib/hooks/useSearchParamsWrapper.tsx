'use client';

import { Suspense } from 'react';
import { useSearchParams as useNextSearchParams } from 'next/navigation';

/**
 * Безопасная обертка для хука useSearchParams
 * Позволяет использовать useSearchParams в компонентах без необходимости оборачивать каждый компонент в Suspense
 * @returns Объект searchParams из next/navigation
 */
export function useSearchParamsWrapper() {
  return useNextSearchParams();
}

/**
 * Компонент-обертка для безопасного использования useSearchParams
 * @param children Дочерние элементы
 * @returns React компонент, обернутый в Suspense
 */
export function SearchParamsProvider({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>;
}

/**
 * HOC для компонентов, использующих useSearchParams
 * @param Component Компонент, который нужно обернуть
 * @returns Обернутый компонент с Suspense
 */
export function withSearchParams<P extends object>(Component: React.ComponentType<P>) {
  return function WithSearchParams(props: P) {
    return (
      <SearchParamsProvider>
        <Component {...props} />
      </SearchParamsProvider>
    );
  };
}

export default SearchParamsProvider; 