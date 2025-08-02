import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { FaStar, FaTimes } from 'react-icons/fa';

interface Specialist {
  id: string;
  firstName: string;
  lastName: string;
  photo: string;
  rating?: number;
  reviewCount?: number;
}

interface ReviewsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ReviewsModal({ isOpen, onClose }: ReviewsModalProps) {
  const router = useRouter();
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSpecialists = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/specialists');
        
        if (!response.ok) {
          throw new Error('Не удалось загрузить специалистов');
        }
        
        const responseData = await response.json();
        
        // Извлекаем массив специалистов, обрабатывая различные форматы ответа API
        let specialistsData: Specialist[] = [];
        if (responseData.success && Array.isArray(responseData.data)) {
          // Новый формат API с полями success и data
          specialistsData = responseData.data;
        } else if (Array.isArray(responseData)) {
          // Старый формат API - массив напрямую
          specialistsData = responseData;
        } else {
          console.error('Неожиданный формат данных специалистов:', responseData);
          throw new Error('Некорректный формат данных специалистов');
        }
        
        // Получаем отзывы для подсчета количества и рейтинга
        const reviewsResponse = await fetch('/api/reviews');
        
        if (!reviewsResponse.ok) {
          throw new Error('Не удалось загрузить отзывы');
        }
        
        const reviewsResponseData = await reviewsResponse.json();
        
        // Извлекаем массив отзывов, обрабатывая различные форматы ответа API
        let reviewsData: any[] = [];
        if (reviewsResponseData.success && Array.isArray(reviewsResponseData.data)) {
          // Новый формат API с полями success и data
          reviewsData = reviewsResponseData.data;
        } else if (Array.isArray(reviewsResponseData)) {
          // Старый формат API - массив напрямую
          reviewsData = reviewsResponseData;
        } else {
          console.warn('Неожиданный формат данных отзывов:', reviewsResponseData);
          reviewsData = []; // Используем пустой массив в случае ошибки
        }
        
        // Обрабатываем данные специалистов, добавляя информацию о рейтинге и количестве отзывов
        const specialistsWithReviews = specialistsData.map((specialist: Specialist) => {
          const specialistReviews = reviewsData.filter(
            (review: any) => review.specialistId === specialist.id
          );
          
          const reviewCount = specialistReviews.length;
          
          // Вычисляем средний рейтинг
          const totalRating = specialistReviews.reduce(
            (sum: number, review: any) => sum + (review.rating || 0), 
            0
          );
          
          const averageRating = reviewCount > 0 
            ? parseFloat((totalRating / reviewCount).toFixed(1)) 
            : 0;
          
          return {
            ...specialist,
            rating: averageRating,
            reviewCount
          };
        });
        
        setSpecialists(specialistsWithReviews);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Произошла ошибка');
        console.error('Ошибка при загрузке специалистов:', err);
      } finally {
        setLoading(false);
      }
    };
    
    if (isOpen) {
      fetchSpecialists();
    }
  }, [isOpen]);
  
  const handleSpecialistClick = (specialistId: string) => {
    // Закрываем модальное окно
    onClose();
    
    // Переходим на страницу специалиста с хешем для прокрутки к отзывам
    const specialistUrl = `/specialists/${specialistId}#reviews`;
    
    // Используем setTimeout, чтобы дать время для закрытия модального окна
    setTimeout(() => {
      // Переходим на страницу специалиста
      router.push(specialistUrl);
      
      // Используем более надежный механизм для прокрутки к разделу отзывов
      // Проверяем наличие элемента несколько раз с увеличивающимся интервалом
      let attempts = 0;
      const maxAttempts = 10;
      const checkAndScrollToReviews = () => {
        const reviewsSection = document.getElementById('reviews');
        if (reviewsSection) {
          reviewsSection.scrollIntoView({ behavior: 'smooth' });
        } else if (attempts < maxAttempts) {
          attempts++;
          // Увеличиваем время ожидания с каждой попыткой
          setTimeout(checkAndScrollToReviews, 300 * attempts);
        }
      };
      
      // Начинаем проверку через 1 секунду после перехода
      setTimeout(checkAndScrollToReviews, 1000);
    }, 100);
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Затемненный фон */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50" 
        onClick={onClose}
      ></div>
      
      {/* Модальное окно */}
      <div className="relative bg-white w-full sm:w-[500px] sm:max-w-lg sm:rounded-xl rounded-t-xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Заголовок */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-bold text-gray-800">Отзывы о специалистах</h2>
          <button 
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100"
          >
            <FaTimes className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        {/* Содержимое */}
        <div className="flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex justify-center items-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#48a9a6] border-r-2"></div>
            </div>
          ) : error ? (
            <div className="text-red-500 p-4 text-center">
              {error}
            </div>
          ) : specialists.length === 0 ? (
            <div className="text-gray-500 p-4 text-center">
              Специалисты не найдены
            </div>
          ) : (
            <div className="space-y-2">
              {specialists.map((specialist) => (
                <div 
                  key={specialist.id}
                  className="bg-white rounded-lg shadow p-3 flex items-center cursor-pointer hover:bg-gray-50"
                  onClick={() => handleSpecialistClick(specialist.id)}
                >
                  <div className="relative h-12 w-12 rounded-full overflow-hidden mr-3">
                    {specialist.photo ? (
                      <Image 
                        src={specialist.photo} 
                        alt={`${specialist.firstName} ${specialist.lastName}`} 
                        fill 
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500">
                        {specialist.firstName.charAt(0)}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-800">
                      {specialist.firstName} {specialist.lastName}
                    </h3>
                    <div className="flex items-center mt-1">
                      <div className="flex items-center mr-2">
                        <FaStar className="text-yellow-400 w-3 h-3" />
                        <span className="text-xs ml-1 text-gray-600">
                          {specialist.rating || 0}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {specialist.reviewCount || 0} отзывов
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 