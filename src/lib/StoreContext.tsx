'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

// Интерфейс для стора
interface StoreState {
  // Добавьте необходимые поля состояния
  [key: string]: any;
}

// Тип для контекста
interface StoreContextType {
  store: StoreState;
  updateStore: (key: string, value: any) => void;
  resetStore: () => void;
}

// Создаем контекст
const StoreContext = createContext<StoreContextType | undefined>(undefined);

// Провайдер контекста
export function StoreProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<StoreState>({});

  // Обновление значения в сторе
  const updateStore = (key: string, value: any) => {
    setStore((prevStore) => ({
      ...prevStore,
      [key]: value,
    }));
  };

  // Сброс стора
  const resetStore = () => {
    setStore({});
  };

  return (
    <StoreContext.Provider value={{ store, updateStore, resetStore }}>
      {children}
    </StoreContext.Provider>
  );
}

// Хук для использования стора
export function useStore() {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore должен использоваться внутри StoreProvider');
  }
  return context;
} 