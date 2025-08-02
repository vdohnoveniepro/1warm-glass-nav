import { useCallback, useEffect, useState } from 'react';

/**
 * Хук для использования вибрации в приложении
 * @param defaultPattern - Шаблон вибрации по умолчанию (длительность в мс или массив длительностей)
 * @returns Объект с функцией вибрации и статусом доступности API
 */
export const useVibration = (defaultPattern: number | number[] = 50) => {
  const [isSupported, setIsSupported] = useState<boolean>(false);
  
  // Проверяем поддержку API при монтировании компонента
  useEffect(() => {
    // Проверяем, находимся ли мы на стороне клиента
    if (typeof window !== 'undefined') {
      // Проверяем поддержку Vibration API
      setIsSupported('vibrate' in navigator);
    }
  }, []);
  
  // Функция для вызова вибрации
  const vibrate = useCallback((pattern?: number | number[]) => {
    if (!isSupported) return false;
    
    const vibrationPattern = pattern || defaultPattern;
    
    try {
      return navigator.vibrate(vibrationPattern);
    } catch (error) {
      console.error('Ошибка при использовании Vibration API:', error);
      return false;
    }
  }, [isSupported, defaultPattern]);
  
  // Функция для остановки вибрации
  const stopVibration = useCallback(() => {
    if (!isSupported) return false;
    
    try {
      return navigator.vibrate(0);
    } catch (error) {
      console.error('Ошибка при остановке вибрации:', error);
      return false;
    }
  }, [isSupported]);
  
  return {
    vibrate, 
    stopVibration,
    isSupported
  };
};

export default useVibration; 