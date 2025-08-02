'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

// Интерфейс для рабочего контекста
interface WorkState {
  isWorking: boolean;
  message: string;
}

// Тип для контекста
interface WorkContextType {
  workState: WorkState;
  startWork: (message?: string) => void;
  endWork: () => void;
}

// Начальное состояние
const initialState: WorkState = {
  isWorking: false,
  message: '',
};

// Создаем контекст
const WorkStateContext = createContext<WorkContextType | undefined>(undefined);

// Провайдер контекста
export function WorkContext({ children }: { children: ReactNode }) {
  const [workState, setWorkState] = useState<WorkState>(initialState);

  // Начать работу
  const startWork = (message = 'Загрузка...') => {
    setWorkState({
      isWorking: true,
      message,
    });
  };

  // Завершить работу
  const endWork = () => {
    setWorkState(initialState);
  };

  return (
    <WorkStateContext.Provider value={{ workState, startWork, endWork }}>
      {children}
      {workState.isWorking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded-lg shadow-lg flex flex-col items-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500 mb-4"></div>
            <p>{workState.message}</p>
          </div>
        </div>
      )}
    </WorkStateContext.Provider>
  );
}

// Хук для использования рабочего контекста
export function useWork() {
  const context = useContext(WorkStateContext);
  if (context === undefined) {
    throw new Error('useWork должен использоваться внутри WorkContext');
  }
  return context;
}