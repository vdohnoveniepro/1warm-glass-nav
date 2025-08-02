'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import { toast } from '@/components/ui/Toast';
import Image from 'next/image';
import Link from 'next/link';
import { FaTrash, FaCheck, FaTimes, FaStar, FaStarHalfAlt, FaRegStar, FaFilter, FaSearch, FaExternalLinkAlt } from 'react-icons/fa';
import { Review, ReviewReply } from '@/models/types';

interface ReviewWithSpecialistInfo extends Review {
  specialistName?: string;
  specialistPhoto?: string;
}

interface Specialist {
  id: string;
  firstName: string;
  lastName: string;
  photo: string;
}

export default function AdminReviewsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  
  const [reviews, setReviews] = useState<ReviewWithSpecialistInfo[]>([]);
  const [specialists, setSpecialists] = useState<Specialist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Фильтры
  const [selectedSpecialist, setSelectedSpecialist] = useState<string>('all');
  const [minRating, setMinRating] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showModerated, setShowModerated] = useState<boolean>(true);
  const [showUnmoderated, setShowUnmoderated] = useState<boolean>(true);
  const [showPublished, setShowPublished] = useState<boolean>(true);
  const [showUnpublished, setShowUnpublished] = useState<boolean>(true);
  
  // Модальное окно удаления
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState<boolean>(false);
  const [reviewToDelete, setReviewToDelete] = useState<string | null>(null);
  
  // Модальное окно ответа
  const [showReplyModal, setShowReplyModal] = useState<boolean>(false);
  const [reviewToReply, setReviewToReply] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<string>('');
  
  // Текущее действие с отзывом
  const [reviewAction, setReviewAction] = useState<{
    id: string;
    action: string;
    loading: boolean;
  } | null>(null);
  
  // Ссылка для доступа к DOM элементу списка отзывов
  const reviewListRef = useRef<HTMLDivElement>(null);
  
  // Загрузка отзывов и специалистов
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Загрузка всех отзывов
        const reviewsResponse = await fetch('/api/reviews');
        if (!reviewsResponse.ok) {
          throw new Error('Не удалось загрузить отзывы');
        }
        const reviewsData = await reviewsResponse.json();
        console.log('Загруженные отзывы:', reviewsData);
        
        // Загрузка всех специалистов
        const specialistsResponse = await fetch('/api/specialists');
        if (!specialistsResponse.ok) {
          throw new Error('Не удалось загрузить специалистов');
        }
        const specialistsData = await specialistsResponse.json();
        console.log('Загруженные специалисты:', specialistsData);
        
        // Проверяем, что specialistsData - это массив
        const specialistsArray = Array.isArray(specialistsData) 
          ? specialistsData 
          : (specialistsData?.specialists || []);
        
        if (!Array.isArray(specialistsArray)) {
          console.error('Ошибка: данные специалистов не являются массивом', specialistsArray);
          throw new Error('Некорректный формат данных специалистов');
        }
        
        // Объединение данных
        const reviewsWithSpecialistInfo = reviewsData.map((review: Review) => {
          const specialist = specialistsArray.find((s: Specialist) => s.id === review.specialistId);
          return {
            ...review,
            specialistName: specialist ? `${specialist.firstName} ${specialist.lastName}` : 'Неизвестный специалист',
            specialistPhoto: specialist?.photo || '/images/default-avatar.png'
          };
        });
        
        setReviews(reviewsWithSpecialistInfo);
        setSpecialists(specialistsArray);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Произошла ошибка при загрузке данных');
        toast.error('Ошибка при загрузке данных');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // Защита маршрута: только для админов
  useEffect(() => {
    if (!isLoading && user) {
      console.log('Данные пользователя в админке отзывов:', user);
    }
    
    const userRole = user?.role?.toUpperCase();
    console.log('Роль пользователя в админке отзывов:', user?.role, 'В верхнем регистре:', userRole);
    
    if (!isLoading && (!user || userRole !== 'ADMIN')) {
      console.log('Доступ запрещен: пользователь не администратор');
      toast.error('У вас нет прав для доступа к управлению отзывами');
      router.replace('/');
    }
    
    // Специальная проверка для пользователя bakeevd@yandex.ru
    const isSpecialAdmin = user?.email === 'bakeevd@yandex.ru';
    if (isSpecialAdmin && userRole !== 'ADMIN') {
      console.log('Обнаружен специальный пользователь bakeevd@yandex.ru, обходим проверку роли');
      // Если это специальный пользователь, даем доступ даже без проверки роли
    }
  }, [user, isLoading, router]);
  
  // Удаление отзыва
  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm('Вы действительно хотите удалить этот отзыв?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/reviews/${reviewId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Не удалось удалить отзыв');
      }
      
      // Обновляем список отзывов
      setReviews(prevReviews => prevReviews.filter(review => review.id !== reviewId));
      toast.success('Отзыв успешно удален');
    } catch (error) {
      console.error('Ошибка при удалении отзыва:', error);
      toast.error('Ошибка при удалении отзыва');
    }
  };
  
  // Изменение статуса модерации отзыва
  const handleToggleModeration = async (reviewId: string, isModerated: boolean) => {
    try {
      const response = await fetch(`/api/reviews/${reviewId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isModerated: !isModerated }),
      });
      
      if (!response.ok) {
        throw new Error('Не удалось изменить статус модерации');
      }
      
      const updatedReview = await response.json();
      
      // Обновляем список отзывов
      setReviews(prevReviews => 
        prevReviews.map(review => 
          review.id === reviewId ? { ...review, isModerated: !isModerated } : review
        )
      );
      
      toast.success(`Отзыв ${!isModerated ? 'проверен' : 'отмечен как непроверенный'}`);
    } catch (error) {
      console.error('Ошибка при изменении статуса модерации:', error);
      toast.error('Ошибка при изменении статуса модерации');
    }
  };
  
  // Изменение статуса публикации отзыва
  const handleTogglePublished = async (reviewId: string, isPublished: boolean) => {
    try {
      const response = await fetch(`/api/reviews/${reviewId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isPublished: !isPublished }),
      });
      
      if (!response.ok) {
        throw new Error('Не удалось изменить статус публикации');
      }
      
      const updatedReview = await response.json();
      
      // Обновляем список отзывов
      setReviews(prevReviews => 
        prevReviews.map(review => 
          review.id === reviewId ? { ...review, isPublished: !isPublished } : review
        )
      );
      
      toast.success(`Отзыв ${!isPublished ? 'опубликован' : 'снят с публикации'}`);
    } catch (error) {
      console.error('Ошибка при изменении статуса публикации:', error);
      toast.error('Ошибка при изменении статуса публикации');
    }
  };
  
  // Удаление ответа на отзыв
  const handleDeleteReply = async (replyId: string, reviewId: string) => {
    if (!confirm('Вы действительно хотите удалить этот ответ?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/reviews/reply/${replyId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Не удалось удалить ответ');
      }
      
      // Обновляем список отзывов
      setReviews(prevReviews => 
        prevReviews.map(review => 
          review.id === reviewId ? 
          { 
            ...review, 
            replies: review.replies.filter(reply => reply.id !== replyId) 
          } : review
        )
      );
      
      toast.success('Ответ успешно удален');
    } catch (error) {
      console.error('Ошибка при удалении ответа:', error);
      toast.error('Ошибка при удалении ответа');
    }
  };
  
  // Изменение статуса модерации ответа
  const handleToggleReplyModeration = async (replyId: string, reviewId: string, isModerated: boolean) => {
    try {
      const response = await fetch(`/api/reviews/reply/${replyId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isModerated: !isModerated }),
      });
      
      if (!response.ok) {
        throw new Error('Не удалось изменить статус модерации');
      }
      
      const updatedReply = await response.json();
      
      // Обновляем список отзывов
      setReviews(prevReviews => 
        prevReviews.map(review => 
          review.id === reviewId ? 
          { 
            ...review, 
            replies: review.replies.map(reply => 
              reply.id === replyId ? updatedReply : reply
            ) 
          } : review
        )
      );
      
      toast.success(`Ответ ${!isModerated ? 'проверен' : 'отмечен как непроверенный'}`);
    } catch (error) {
      console.error('Ошибка при изменении статуса модерации ответа:', error);
      toast.error('Ошибка при изменении статуса модерации');
    }
  };
  
  // Изменение статуса публикации ответа
  const handleToggleReplyPublished = async (replyId: string, reviewId: string, isPublished: boolean) => {
    try {
      const response = await fetch(`/api/reviews/reply/${replyId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isPublished: !isPublished }),
      });
      
      if (!response.ok) {
        throw new Error('Не удалось изменить статус публикации');
      }
      
      const updatedReply = await response.json();
      
      // Обновляем список отзывов
      setReviews(prevReviews => 
        prevReviews.map(review => 
          review.id === reviewId ? 
          { 
            ...review, 
            replies: review.replies.map(reply => 
              reply.id === replyId ? updatedReply : reply
            ) 
          } : review
        )
      );
      
      toast.success(`Ответ ${!isPublished ? 'опубликован' : 'снят с публикации'}`);
    } catch (error) {
      console.error('Ошибка при изменении статуса публикации ответа:', error);
      toast.error('Ошибка при изменении статуса публикации');
    }
  };
  
  // Фильтрация отзывов
  const filteredReviews = reviews.filter(review => {
    // Фильтр по специалисту
    if (selectedSpecialist !== 'all' && review.specialistId !== selectedSpecialist) {
      return false;
    }
    
    // Фильтр по рейтингу
    if (review.rating < minRating) {
      return false;
    }
    
    // Фильтр по статусу модерации
    if (!showModerated && review.isModerated) {
      return false;
    }
    if (!showUnmoderated && !review.isModerated) {
      return false;
    }
    
    // Фильтр по статусу публикации
    if (!showPublished && review.isPublished) {
      return false;
    }
    if (!showUnpublished && !review.isPublished) {
      return false;
    }
    
    // Поиск по тексту
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const textMatch = review.text.toLowerCase().includes(query);
      const authorMatch = review.user?.firstName.toLowerCase().includes(query) || 
                         (review.user?.lastName || '').toLowerCase().includes(query);
      const specialistMatch = (review.specialistName || '').toLowerCase().includes(query);
      
      if (!textMatch && !authorMatch && !specialistMatch) {
        return false;
      }
    }
    
    return true;
  });
  
  // Рендер звездочек рейтинга
  const renderRating = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    for (let i = 1; i <= 5; i++) {
      if (i <= fullStars) {
        stars.push(<FaStar key={i} className="text-yellow-400" />);
      } else if (i === fullStars + 1 && hasHalfStar) {
        stars.push(<FaStarHalfAlt key={i} className="text-yellow-400" />);
      } else {
        stars.push(<FaRegStar key={i} className="text-yellow-400" />);
      }
    }
    
    return <div className="flex">{stars}</div>;
  };
  
  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#48a9a6] border-r-2"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="text-red-500 mb-4">Ошибка: {error}</div>
        <button 
          onClick={() => window.location.reload()} 
          className="px-4 py-2 bg-[#48a9a6] text-white rounded-md"
        >
          Попробовать снова
        </button>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">Управление отзывами</h1>
      
      <Link href="/admin" className="inline-block mb-6 text-[#48a9a6] hover:underline">
        ← Вернуться в панель управления
      </Link>
      
      {/* Фильтры */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
          <div className="w-full md:w-1/4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <FaFilter className="inline mr-1" /> Специалист
            </label>
            <select
              value={selectedSpecialist}
              onChange={(e) => setSelectedSpecialist(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#48a9a6] focus:border-[#48a9a6]"
            >
              <option value="all">Все специалисты</option>
              {specialists.map(specialist => (
                <option key={specialist.id} value={specialist.id}>
                  {specialist.firstName} {specialist.lastName}
                </option>
              ))}
            </select>
          </div>
          
          <div className="w-full md:w-1/4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <FaStar className="inline mr-1" /> Минимальный рейтинг
            </label>
            <select
              value={minRating}
              onChange={(e) => setMinRating(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#48a9a6] focus:border-[#48a9a6]"
            >
              <option value="0">Любой рейтинг</option>
              <option value="1">1 звезда и выше</option>
              <option value="2">2 звезды и выше</option>
              <option value="3">3 звезды и выше</option>
              <option value="4">4 звезды и выше</option>
              <option value="5">Только 5 звезд</option>
            </select>
          </div>
          
          <div className="w-full md:w-2/4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <FaSearch className="inline mr-1" /> Поиск
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по тексту отзыва, автору или специалисту"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#48a9a6] focus:border-[#48a9a6]"
            />
          </div>
        </div>
        
        <div className="mt-4 flex flex-wrap gap-4">
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={showModerated}
              onChange={() => setShowModerated(!showModerated)}
              className="form-checkbox h-4 w-4 text-[#48a9a6]"
            />
            <span className="ml-2">Проверенные</span>
          </label>
          
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={showUnmoderated}
              onChange={() => setShowUnmoderated(!showUnmoderated)}
              className="form-checkbox h-4 w-4 text-[#48a9a6]"
            />
            <span className="ml-2">Непроверенные</span>
          </label>
          
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={showPublished}
              onChange={() => setShowPublished(!showPublished)}
              className="form-checkbox h-4 w-4 text-[#48a9a6]"
            />
            <span className="ml-2">Опубликованные</span>
          </label>
          
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={showUnpublished}
              onChange={() => setShowUnpublished(!showUnpublished)}
              className="form-checkbox h-4 w-4 text-[#48a9a6]"
            />
            <span className="ml-2">Неопубликованные</span>
          </label>
        </div>
      </div>
      
      {/* Статистика */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="p-3 bg-blue-50 rounded-md">
            <div className="text-2xl font-bold text-blue-600">{reviews.length}</div>
            <div className="text-sm text-gray-600">Всего отзывов</div>
          </div>
          
          <div className="p-3 bg-green-50 rounded-md">
            <div className="text-2xl font-bold text-green-600">
              {reviews.filter(r => r.isModerated).length}
            </div>
            <div className="text-sm text-gray-600">Проверенных</div>
          </div>
          
          <div className="p-3 bg-amber-50 rounded-md">
            <div className="text-2xl font-bold text-amber-600">
              {reviews.filter(r => r.isPublished).length}
            </div>
            <div className="text-sm text-gray-600">Опубликованных</div>
          </div>
          
          <div className="p-3 bg-purple-50 rounded-md">
            <div className="text-2xl font-bold text-purple-600">
              {reviews.reduce((total, review) => total + review.replies.length, 0)}
            </div>
            <div className="text-sm text-gray-600">Ответов на отзывы</div>
          </div>
        </div>
      </div>
      
      {/* Список отзывов */}
      <div className="space-y-6">
        {filteredReviews.length === 0 ? (
          <div className="bg-gray-50 p-8 text-center rounded-lg">
            <p className="text-gray-500">Отзывы не найдены</p>
          </div>
        ) : (
          filteredReviews.map(review => (
            <div key={review.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-4 border-b">
                <div className="flex justify-between items-start">
                  <div className="flex items-center">
                    <Link href={`/specialists/${review.specialistId}`} className="flex items-center hover:opacity-80 transition-opacity">
                      <div className="relative h-12 w-12 rounded-full overflow-hidden mr-3">
                        {review.specialistPhoto ? (
                          <Image 
                            src={review.specialistPhoto} 
                            alt={review.specialistName || 'Специалист'} 
                            fill 
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500">
                            {(review.specialistName || '?').charAt(0)}
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="font-medium flex items-center">
                          {review.specialistName}
                          <FaExternalLinkAlt className="ml-1 text-gray-400" size={12} />
                        </h3>
                        <div className="text-sm text-gray-500">
                          {new Date(review.createdAt).toLocaleDateString('ru-RU')}
                        </div>
                      </div>
                    </Link>
                  </div>
                  
                  <div className="flex items-center">
                    {renderRating(review.rating)}
                  </div>
                </div>
              </div>
              
              <div className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-center mb-3">
                    <div className="relative h-10 w-10 rounded-full overflow-hidden mr-3">
                      {review.user?.avatar ? (
                        <Image 
                          src={review.user.avatar} 
                          alt={review.user?.firstName || 'Пользователь'} 
                          fill 
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500">
                          {(review.user?.firstName || '?').charAt(0)}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="font-medium">
                        {review.user?.firstName} {review.user?.lastName || ''}
                      </div>
                      <div className="text-xs text-gray-500">
                        Клиент
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleToggleModeration(review.id, review.isModerated)}
                      className={`p-2 rounded-md ${review.isModerated ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}
                      title={review.isModerated ? 'Отменить проверку' : 'Отметить как проверенный'}
                    >
                      {review.isModerated ? <FaCheck /> : <FaTimes />}
                    </button>
                    
                    <button
                      onClick={() => handleTogglePublished(review.id, review.isPublished)}
                      className={`p-2 rounded-md ${review.isPublished ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
                      title={review.isPublished ? 'Снять с публикации' : 'Опубликовать'}
                    >
                      {review.isPublished ? <FaCheck /> : <FaTimes />}
                    </button>
                    
                    <button
                      onClick={() => handleDeleteReview(review.id)}
                      className="p-2 bg-red-100 text-red-600 rounded-md"
                      title="Удалить отзыв"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
                
                <p className="text-gray-700 mb-4">{review.text}</p>
                
                {review.attachments && Array.isArray(review.attachments) && review.attachments.length > 0 && (
                  <div className="mb-4">
                    <div className="text-sm font-medium text-gray-500 mb-2">Вложения:</div>
                    <div className="flex flex-wrap gap-2">
                      <div className="text-gray-400 text-sm">
                        Вложения скрыты (функция отключена)
                        </div>
                    </div>
                  </div>
                )}
                
                {/* Ответы на отзыв */}
                {review.replies && review.replies.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="text-sm font-medium text-gray-500 mb-2">Ответы ({review.replies.length}):</div>
                    <div className="space-y-3">
                      {review.replies.map((reply: ReviewReply) => (
                        <div key={reply.id} className="bg-gray-50 p-3 rounded-md">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center mb-2">
                              <div className="relative h-8 w-8 rounded-full overflow-hidden mr-2">
                                {reply.user?.avatar ? (
                                  <Image 
                                    src={reply.user.avatar} 
                                    alt={reply.user?.firstName || 'Пользователь'} 
                                    fill 
                                    className="object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs">
                                    {(reply.user?.firstName || '?').charAt(0)}
                                  </div>
                                )}
                              </div>
                              <div>
                                <div className="font-medium text-sm">
                                  {reply.user?.firstName} {reply.user?.lastName || ''}
                                  {reply.user?.role && (
                                    <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                                      reply.user.role.toUpperCase() === 'SPECIALIST' 
                                        ? 'bg-blue-100 text-blue-700' 
                                        : reply.user.role.toUpperCase() === 'ADMIN' 
                                          ? 'bg-purple-100 text-purple-700'
                                          : 'bg-gray-100 text-gray-700'
                                    }`}>
                                      {reply.user.role.toUpperCase() === 'SPECIALIST' 
                                        ? 'Специалист' 
                                        : reply.user.role.toUpperCase() === 'ADMIN'
                                          ? 'Администратор'
                                          : 'Пользователь'
                                      }
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {new Date(reply.createdAt).toLocaleDateString('ru-RU')}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleToggleReplyModeration(reply.id, review.id, reply.isModerated)}
                                className={`p-1 rounded-md ${reply.isModerated ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}
                                title={reply.isModerated ? 'Отменить проверку' : 'Отметить как проверенный'}
                              >
                                {reply.isModerated ? <FaCheck size={12} /> : <FaTimes size={12} />}
                              </button>
                              
                              <button
                                onClick={() => handleToggleReplyPublished(reply.id, review.id, reply.isPublished)}
                                className={`p-1 rounded-md ${reply.isPublished ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
                                title={reply.isPublished ? 'Снять с публикации' : 'Опубликовать'}
                              >
                                {reply.isPublished ? <FaCheck size={12} /> : <FaTimes size={12} />}
                              </button>
                              
                              <button
                                onClick={() => handleDeleteReply(reply.id, review.id)}
                                className="p-1 bg-red-100 text-red-600 rounded-md"
                                title="Удалить ответ"
                              >
                                <FaTrash size={12} />
                              </button>
                            </div>
                          </div>
                          <p className="text-sm">{reply.text}</p>
                          <div className="mt-1 text-xs text-gray-500 flex justify-end space-x-2">
                            <span className={`${reply.isModerated ? 'text-green-600' : 'text-yellow-600'}`}>
                              {reply.isModerated ? 'Проверен' : 'Не проверен'}
                            </span>
                            <span className={`${reply.isPublished ? 'text-blue-600' : 'text-gray-600'}`}>
                              {reply.isPublished ? 'Опубликован' : 'Не опубликован'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="bg-gray-50 px-4 py-2 flex justify-between text-xs text-gray-500">
                <div>
                  ID: {review.id}
                </div>
                <div className="flex space-x-3">
                  <span className={`${review.isModerated ? 'text-green-600' : 'text-yellow-600'}`}>
                    {review.isModerated ? 'Проверен' : 'Не проверен'}
                  </span>
                  <span className={`${review.isPublished ? 'text-blue-600' : 'text-gray-600'}`}>
                    {review.isPublished ? 'Опубликован' : 'Не опубликован'}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
} 