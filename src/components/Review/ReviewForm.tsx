'use client';

import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { FaUser, FaEnvelope, FaRegSmile, FaTimes } from 'react-icons/fa';
import Image from 'next/image';
import { useAuth } from '@/lib/AuthContext';
import StarRating from './StarRating';
import { Review } from '@/models/types';
import { toastService } from '@/components/ui/Toast';

type ReviewFormProps = {
  specialistId: string;
  specialistName: string;
  serviceId?: string;
  serviceName?: string;
  onSuccess?: (review: Review) => void;
  className?: string;
  reviewToEdit?: Review;
  hideForm: () => void;
};

// Определение типов для формы отзыва
type FormData = {
  author: string;
  email: string;
};

// Тип для услуги
type Service = {
  id: string;
  name: string;
  description?: string;
  price?: number;
  imageUrl?: string;
};

export default function ReviewForm({
  specialistId,
  specialistName,
  serviceId,
  serviceName,
  onSuccess,
  className = '',
  reviewToEdit,
  hideForm
}: ReviewFormProps) {
  const { user, isAuthenticated } = useAuth();
  const [rating, setRating] = useState<number>(reviewToEdit?.rating || 5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [reviewText, setReviewText] = useState('');
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string | undefined>(reviewToEdit?.serviceId || serviceId);
  const [selectedServiceName, setSelectedServiceName] = useState<string | undefined>(reviewToEdit?.serviceName || serviceName);
  const [isLoadingServices, setIsLoadingServices] = useState(false);
  const [isEditMode, setIsEditMode] = useState(!!reviewToEdit);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  
  // Инициализация формы при редактировании
  useEffect(() => {
    if (reviewToEdit) {
      setReviewText(reviewToEdit.text || '');
      setSelectedServiceId(reviewToEdit.serviceId);
      setSelectedServiceName(reviewToEdit.serviceName);
    }
  }, [reviewToEdit]);
  
  // Обработка изменения рейтинга
  const handleRatingChange = (value: number) => {
    setRating(value);
  };
  
  // Обработка выбора услуги
  const handleServiceSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const serviceId = e.target.value;
    setSelectedServiceId(serviceId);
    
    if (serviceId) {
      const selected = services.find(s => s.id === serviceId);
      setSelectedServiceName(selected?.name);
    } else {
      setSelectedServiceName(undefined);
    }
  };
  
  // Обработка смайликов
  const handleEmojiClick = (emoji: string) => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      
      // Вставляем эмодзи в текущую позицию курсора
      const newText = text.slice(0, start) + emoji + text.slice(end);
      
      // Обновляем состояние
      setReviewText(newText);
      
      // После обновления состояния, устанавливаем курсор после вставленного эмодзи
      setTimeout(() => {
        textarea.focus();
        textarea.selectionStart = start + emoji.length;
        textarea.selectionEnd = start + emoji.length;
      }, 0);
    }
  };
  
  // Хук для обработки кликов вне элемента (закрытие picker'а эмодзи)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Загрузка услуг для специалиста
  useEffect(() => {
    const fetchServices = async () => {
      if (!specialistId) return;
      
      setIsLoadingServices(true);
      try {
        const response = await fetch(`/api/specialists/${specialistId}/services`);
        if (!response.ok) {
          console.error(`Ошибка загрузки услуг: ${response.status} ${response.statusText}`);
          // Не выбрасываем исключение, чтобы форма продолжала работать
          setServices([]);
          return;
              }
        
        const data = await response.json();
        setServices(data);
      } catch (error) {
        console.error('Ошибка при загрузке услуг:', error);
        // Устанавливаем пустой массив услуг вместо выбрасывания исключения
        setServices([]);
      } finally {
        setIsLoadingServices(false);
      }
    };
    
    fetchServices();
  }, [specialistId]);
  
  // Обработка формы с react-hook-form
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>();
  
  // Отправка формы
  const onSubmit = async (data: FormData) => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      console.log('Начало отправки отзыва', { 
        isAuthenticated, 
        userId: user?.id,
        user: user ? {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email
        } : null,
        specialistId,
        rating,
        reviewText: reviewText.length,
        selectedServiceId
      });
      
      // Проверяем наличие рейтинга и текста
      if (!rating) {
        console.error('Ошибка: не указан рейтинг');
        throw new Error('Пожалуйста, укажите рейтинг');
      }
      
      if (!reviewText.trim()) {
        console.error('Ошибка: не указан текст отзыва');
        throw new Error('Пожалуйста, напишите текст отзыва');
      }
      
      // Если редактируем существующий отзыв
      if (reviewToEdit) {
        console.log('Редактирование отзыва:', reviewToEdit.id);
        // TODO: реализовать редактирование отзыва
        return;
      }
      
      // Создаем объект с данными отзыва
      const reviewData = {
        specialistId,
        text: reviewText,
        rating,
        serviceId: selectedServiceId,
        serviceName: selectedServiceName,
        ...(isAuthenticated ? {
          // Если пользователь авторизован, передаем идентификатор
          userId: user?.id
        } : {
          // Если не авторизован, передаем данные из формы
          author: data.author,
          email: data.email
        })
      };
      
      console.log('Отправка отзыва:', reviewData);
      
      // Отправляем запрос на сервер
      const response = await fetch('/api/reviews', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        body: JSON.stringify(reviewData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Не удалось отправить отзыв');
      }
      
      const result = await response.json();
      console.log('Ответ сервера:', result);
      
      // Дополнительная проверка структуры ответа
      if (!result || (typeof result === 'object' && Object.keys(result).length === 0)) {
        console.error('Сервер вернул пустой ответ');
        throw new Error('Сервер вернул пустой ответ');
      }
      
      // Показываем уведомление об успешной отправке
      toastService.success('Спасибо за ваш отзыв! Он успешно опубликован.');
      
      // Проверяем структуру ответа и находим данные отзыва
      let finalReviewData = result;
      if (result.review) {
        finalReviewData = result.review;
      } else if (!result.id) {
        console.warn('Ответ сервера не содержит ID отзыва:', result);
        // Если в ответе нет id, создаем временный id для отображения
        finalReviewData = {
          ...result,
          id: `temp_${Date.now()}`,
          createdAt: new Date().toISOString()
        };
      }
      
      // Обновляем список отзывов
      if (onSuccess) {
        console.log('Передаем данные отзыва в родительский компонент:', finalReviewData);
        onSuccess(finalReviewData);
      }
      
      // Сбрасываем форму
      setSuccess(true);
      setReviewText('');
      setRating(5);
      setSelectedServiceId(undefined);
      setSelectedServiceName(undefined);
      
      // Закрываем форму после успешной отправки
      setTimeout(() => {
        hideForm();
        setSuccess(false);
      }, 2000);
      
    } catch (error) {
      console.error('Ошибка при отправке отзыва:', error);
      setError((error as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`bg-white p-4 sm:p-6 rounded-lg shadow-md ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg sm:text-xl font-semibold">Оставить отзыв о специалисте</h3>
        <button 
          onClick={hideForm}
          className="text-gray-500 hover:text-gray-700 p-1.5 rounded-full hover:bg-gray-100"
          title="Закрыть форму отзыва"
        >
          <FaTimes size={16} />
        </button>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-200 text-red-700 p-3 rounded-md mb-4">
          {error}
        </div>
      )}
      
      {success ? (
        <div className="bg-green-100 border border-green-200 text-green-700 p-4 rounded-md mb-4">
          Спасибо за ваш отзыв! Он успешно опубликован.
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 sm:space-y-5">
          {/* Выбор рейтинга */}
          <div className="mb-4">
            <h3 className="text-lg font-medium mb-2">Ваша оценка</h3>
            <StarRating
              size="lg" 
              value={rating} 
              onChange={handleRatingChange} 
              showLabels={true}
            />
          </div>
          
          {/* Выбор услуги */}
          {services.length > 0 && !isLoadingServices && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Услуга
              </label>
              <div className={`relative ${isLoadingServices ? 'opacity-60' : ''}`}>
                {isLoadingServices && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-50 z-10">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-[#48a9a6]"></div>
                  </div>
                )}
                <select
                  value={selectedServiceId || ''}
                  onChange={handleServiceSelect}
                  className="w-full p-2 sm:p-3 border border-gray-300 rounded-md focus:ring-[#48a9a6] focus:border-[#48a9a6] appearance-none"
                  disabled={isLoadingServices}
                >
                  <option value="">Без услуги</option>
                  {services.map((service) => (
                    <option 
                      key={service.id} 
                      value={service.id}
                      className="flex items-center gap-2"
                    >
                      {service.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ваш отзыв
            </label>
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                className="w-full p-2 sm:p-3 border border-gray-300 rounded-md focus:ring-[#48a9a6] focus:border-[#48a9a6] resize-none min-h-[100px] sm:min-h-[120px]"
                placeholder="Поделитесь своими впечатлениями..."
              />
              
              <div className="absolute bottom-2 right-2 flex items-center">
                <div className="relative">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowEmojiPicker(!showEmojiPicker);
                    }}
                    className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-full transition-colors shadow-md flex items-center justify-center w-10 h-10"
                    title="Добавить эмодзи"
                  >
                    <FaRegSmile size={18} className="sm:text-[20px]" />
                  </button>
                  
                  {showEmojiPicker && (
                      <div 
                        ref={emojiPickerRef}
                      className="absolute bottom-12 right-0 bg-white rounded-lg shadow-lg p-4 z-50 w-64 sm:w-72"
                    >
                      {/* Эмодзи пикер здесь */}
                      <div className="grid grid-cols-8 sm:grid-cols-9 gap-1">
                        {['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕'].map((emoji, index) => (
                                  <button
                                    key={index}
                                    type="button"
                            className="text-2xl hover:bg-gray-100 rounded"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleEmojiClick(emoji);
                              // Не закрываем пикер после выбора
                            }}
                                  >
                                    {emoji}
                                  </button>
                                ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          {/* Информация о пользователе (если не авторизован) */}
          {!isAuthenticated && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ваше имя
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaUser className="text-[#48a9a6]" />
                  </div>
                  <input
                    type="text"
                    className="pl-10 w-full p-2 sm:p-3 border border-gray-300 rounded-md focus:ring-[#48a9a6] focus:border-[#48a9a6]"
                    placeholder="Ваше имя"
                    {...register('author', { required: true })}
                  />
                </div>
                {errors.author && (
                  <p className="text-red-500 text-sm mt-1">Пожалуйста, укажите ваше имя</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaEnvelope className="text-[#48a9a6]" />
                  </div>
                  <input
                    type="email"
                    className="pl-10 w-full p-2 sm:p-3 border border-gray-300 rounded-md focus:ring-[#48a9a6] focus:border-[#48a9a6]"
                    placeholder="Ваш email"
                    {...register('email', { required: true })}
                  />
                </div>
                {errors.email && (
                  <p className="text-red-500 text-sm mt-1">Пожалуйста, укажите email</p>
                )}
              </div>
            </>
          )}
          
          {/* Кнопки */}
          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={hideForm}
              className="px-3 sm:px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors text-sm sm:text-base"
            >
              Отменить
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-3 sm:px-4 py-2 bg-[#48a9a6] text-white rounded-md hover:bg-[#3a8a87] transition-colors text-sm sm:text-base ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isSubmitting ? 'Отправка...' : 'Отправить отзыв'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
} 