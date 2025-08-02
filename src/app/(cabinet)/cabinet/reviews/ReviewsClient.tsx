'use client';

import { useState, useEffect } from 'react';
import { FaStar, FaCalendarAlt, FaChevronDown, FaChevronUp, FaUser, FaEdit, FaTrash, FaArrowLeft } from 'react-icons/fa';
import { useAuth } from '@/lib/AuthContext';
import Image from 'next/image';
import Link from 'next/link';
import { Review as ReviewType, UserRole } from '@/models/types';
import StarRating from '@/components/Review/StarRating';
import { toast } from '@/components/ui/Toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParamsWrapper } from '@/lib/hooks/useSearchParamsWrapper';

// Расширение типа Review для включения данных о специалисте
interface ReviewWithSpecialist extends ReviewType {
  specialist?: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    photo?: string;
    position?: string; // Должность специалиста
  };
}

export default function ReviewsClient() {
  const { user, isAuthenticated } = useAuth();
  const [reviews, setReviews] = useState<ReviewWithSpecialist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openReviews, setOpenReviews] = useState<Record<string, boolean>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Загрузка отзывов пользователя
  useEffect(() => {
    const fetchUserReviews = async () => {
      if (!isAuthenticated || !user) return;
      
      try {
        setLoading(true);
        // Загружаем все отзывы
        const response = await fetch('/api/reviews');
        
        if (!response.ok) {
          throw new Error('Не удалось загрузить отзывы');
        }
        
        const allReviews = await response.json();
        
        // Фильтруем отзывы пользователя
        const userReviews = allReviews.filter((review: ReviewType) => 
          review.userId === user.id
        );
        
        // Сортируем от новых к старым
        userReviews.sort((a: ReviewType, b: ReviewType) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        
        // Загружаем информацию о специалистах для каждого отзыва
        const reviewsWithSpecialistInfo = await Promise.all(
          userReviews.map(async (review: ReviewType): Promise<ReviewWithSpecialist> => {
            try {
              const specialistResponse = await fetch(`/api/specialists/${review.specialistId}`);
              if (specialistResponse.ok) {
                const specialistData = await specialistResponse.json();
                
                if (specialistData && specialistData.success && specialistData.data) {
                  // Используем структуру из ответа API
                  return {
                    ...review,
                    specialist: {
                      id: specialistData.data.id || review.specialistId,
                      firstName: specialistData.data.firstName || '',
                      lastName: specialistData.data.lastName || '',
                      avatar: specialistData.data.avatar,
                      photo: specialistData.data.photo,
                      position: specialistData.data.position,
                    }
                  };
                }
              }
              return review as ReviewWithSpecialist;
            } catch (error) {
              console.error(`Ошибка при загрузке информации о специалисте ${review.specialistId}:`, error);
              return review as ReviewWithSpecialist;
            }
          })
        );
        
        setReviews(reviewsWithSpecialistInfo);
      } catch (err) {
        console.error('Ошибка при загрузке отзывов:', err);
        setError('Произошла ошибка при загрузке отзывов. Пожалуйста, попробуйте позже.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserReviews();
  }, [user, isAuthenticated]);
  
  // Форматирование даты
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Дата не указана';
    
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date);
  };
  
  // Обработчик редактирования отзыва
  const handleEditReview = (reviewId: string) => {
    // Перенаправляем на страницу специалиста с открытой формой редактирования
    const review = reviews.find(r => r.id === reviewId);
    if (review) {
      // Сохраняем ID отзыва для редактирования в localStorage
      localStorage.setItem('editReviewId', reviewId);
      window.location.href = `/specialists/${review.specialistId}#reviews-section`;
    }
  };
  
  // Обработчик удаления отзыва
  const handleDeleteReview = async (reviewId: string) => {
    try {
      const response = await fetch(`/api/reviews/${reviewId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Не удалось удалить отзыв');
      }

      // Удаляем отзыв из локального состояния
      setReviews(reviews.filter(review => review.id !== reviewId));
      setShowDeleteConfirm(null);
      toast.success('Отзыв успешно удален');
    } catch (err) {
      console.error('Ошибка при удалении отзыва:', err);
      toast.error('Ошибка при удалении отзыва');
    }
  };
  
  // Переключение отображения ответов
  const toggleReviewOpen = (reviewId: string) => {
    setOpenReviews(prev => ({
      ...prev,
      [reviewId]: !prev[reviewId]
    }));
  };
  
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold mb-4">Требуется авторизация</h1>
            <p className="text-gray-600 mb-6">Для доступа к личному кабинету необходимо войти в аккаунт</p>
            <Link 
              href="/login" 
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors"
            >
              Войти в аккаунт
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex flex-col sm:flex-row sm:items-center mb-6">
          <Link href="/cabinet" className="flex items-center text-[#48a9a6] mb-2 sm:mb-0 sm:mr-4 hover:text-[#357d7a] transition-colors">
            <FaArrowLeft className="mr-2" /> Назад
          </Link>
          <h1 className="text-2xl font-bold mb-6 sm:mb-0">Мои отзывы</h1>
        </div>
        
        {loading ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-600">Загрузка отзывов...</p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-lg shadow-md p-8">
            <div className="text-red-500 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-center">{error}</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="text-gray-400 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2">У вас пока нет отзывов</h2>
            <p className="text-gray-600 mb-6">Вы можете оставить отзыв о специалисте на его странице</p>
            <Link 
              href="/specialists" 
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors"
            >
              Перейти к специалистам
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {reviews.map((review) => (
              <div 
                key={review.id} 
                className="bg-white rounded-lg shadow-md overflow-hidden"
              >
                {/* Модальное окно подтверждения удаления */}
                {showDeleteConfirm === review.id && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
                      <h3 className="text-lg font-semibold mb-3">Подтверждение удаления</h3>
                      <p className="text-gray-700 mb-4">Вы уверены, что хотите удалить этот отзыв? Это действие нельзя отменить.</p>
                      <div className="flex justify-end gap-3">
                        <button 
                          onClick={() => setShowDeleteConfirm(null)}
                          className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
                        >
                          Отмена
                        </button>
                        <button 
                          onClick={() => handleDeleteReview(review.id)}
                          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Шапка с информацией о специалисте */}
                <div className="p-6 border-b border-gray-200">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center">
                      <div className="text-gray-600 mr-4">
                        <div className="text-sm">Отзыв оставлен</div>
                        <div className="flex items-center text-gray-800 mt-1">
                          <FaCalendarAlt className="mr-2 text-blue-500" size={14} />
                          {formatDate(review.createdAt)}
                        </div>
                      </div>
                      
                      {review.specialist && (
                        <div>
                          <div className="text-sm text-gray-600">Специалист</div>
                          <div className="flex items-center mt-1">
                            <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 mr-2 flex-shrink-0">
                              {review.specialist.photo ? (
                                <Image 
                                  src={review.specialist.photo} 
                                  alt={`${review.specialist.firstName} ${review.specialist.lastName}`} 
                                  width={32} 
                                  height={32}
                                  className="object-cover w-full h-full"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-blue-100 text-blue-500">
                                  <FaUser size={16} />
                                </div>
                              )}
                            </div>
                            <Link 
                              href={`/specialists/${review.specialist.id}`} 
                              className="text-blue-600 hover:underline"
                            >
                              {review.specialist.firstName} {review.specialist.lastName}
                            </Link>
                            {review.specialist.position && (
                              <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                                {review.specialist.position}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditReview(review.id)}
                        className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
                        aria-label="Редактировать отзыв"
                      >
                        <FaEdit size={18} />
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(review.id)}
                        className="p-2 text-gray-500 hover:text-red-600 transition-colors"
                        aria-label="Удалить отзыв"
                      >
                        <FaTrash size={18} />
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center mb-2">
                      <StarRating rating={review.rating} size="md" />
                      <span className="ml-2 text-lg font-medium">{review.rating.toFixed(1)}</span>
                    </div>
                    
                    <h3 className="text-lg font-semibold mb-2">{review.title || 'Отзыв о специалисте'}</h3>
                    
                    <div className="text-gray-700">
                      {review.content}
                    </div>
                  </div>
                </div>
                
                {/* Блок с ответами и реакциями */}
                {(review.replies && review.replies.length > 0) && (
                  <div className="border-t border-gray-100">
                    <button
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                      onClick={() => toggleReviewOpen(review.id)}
                    >
                      <span className="font-medium">
                        {review.replies.length} {review.replies.length === 1 ? 'ответ' : 
                          review.replies.length > 1 && review.replies.length < 5 ? 'ответа' : 'ответов'}
                      </span>
                      {openReviews[review.id] ? (
                        <FaChevronUp className="text-gray-500" />
                      ) : (
                        <FaChevronDown className="text-gray-500" />
                      )}
                    </button>
                    
                    <AnimatePresence>
                      {openReviews[review.id] && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="p-4 bg-gray-50">
                            {review.replies.map((reply) => (
                              <div key={reply.id} className="bg-white p-4 rounded-lg mb-3 shadow-sm">
                                <div className="flex justify-between items-start mb-2">
                                  <div className="flex items-center">
                                    <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 mr-2">
                                      {reply.authorPhoto ? (
                                        <Image 
                                          src={reply.authorPhoto} 
                                          alt={reply.authorName || 'Автор'} 
                                          width={32} 
                                          height={32}
                                          className="object-cover w-full h-full"
                                        />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-blue-100 text-blue-500">
                                          <FaUser size={16} />
                                        </div>
                                      )}
                                    </div>
                                    <div>
                                      <div className="font-medium">{reply.authorName || 'Администратор'}</div>
                                      <div className="text-xs text-gray-500">{formatDate(reply.createdAt)}</div>
                                    </div>
                                  </div>
                                </div>
                                <div className="text-gray-700">
                                  {reply.content}
                                </div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
