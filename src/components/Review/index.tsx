'use client';

import { useState, useEffect, useRef, RefCallback, useMemo, useCallback, useReducer } from 'react';
import ReviewForm from './ReviewForm';
import { Review as ReviewType, UserRole, ReviewReactionType } from '@/models/types';
import { FaStar, FaUser, FaCalendarAlt, FaReply, FaTimes, FaRegSmile, FaThumbsUp, FaHeart, FaEnvelope, FaSearch, FaExpand, FaEdit, FaTrash } from 'react-icons/fa';
import { MdOutlineWavingHand, MdOutlineMoodBad, MdClose, MdZoomOutMap } from 'react-icons/md';
import { RiEmotionLaughLine } from 'react-icons/ri';
import Image from 'next/image';
import StarRating from './StarRating';
import { useAuth } from '@/lib/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { toastService } from '@/components/ui/Toast';

type ReviewsProps = {
  specialistId: string;
  specialistName: string;
  className?: string;
};

// Тип для действий редьюсера
type ReplyAction = 
  | { type: 'SET_TEXT'; payload: string }
  | { type: 'CLEAR_TEXT' };

// Редьюсер для управления текстом ответа
function replyReducer(state: string, action: ReplyAction): string {
  switch (action.type) {
    case 'SET_TEXT':
      return action.payload;
    case 'CLEAR_TEXT':
      return '';
    default:
      return state;
  }
}

export default function Reviews({ specialistId, specialistName, className = '' }: ReviewsProps) {
  const { user, isAuthenticated, showLoginModal } = useAuth();
  const [reviews, setReviews] = useState<ReviewType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddReviewForm, setShowAddReviewForm] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyingToReply, setReplyingToReply] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState<Record<string, boolean>>({});
  const [lastInteractedElementId, setLastInteractedElementId] = useState<string | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [currentReviewImages, setCurrentReviewImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [reviewToEdit, setReviewToEdit] = useState<ReviewType | undefined>(undefined);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  
  const emojiPickerRefs = useRef<{[key: string]: HTMLDivElement | null}>({});
  const replyInputRef = useRef<HTMLTextAreaElement>(null);
  const reviewsContainerRef = useRef<HTMLDivElement>(null);
  const reviewRefs = useRef<{[key: string]: HTMLDivElement | null}>({});
  const replyRefs = useRef<{[key: string]: HTMLDivElement | null}>({});

  // Добавляем состояние для отслеживания идущих запросов реакций
  const [pendingReactions, setPendingReactions] = useState<Record<string, boolean>>({});
  
  // Заменяем useState на useReducer для более эффективной обработки текста
  const [replyText, dispatchReplyText] = useReducer(replyReducer, '');
  
  // Функции для создания callback ref
  const createReviewRef = (id: string): RefCallback<HTMLDivElement> => (element) => {
    reviewRefs.current[id] = element;
  };
  
  const createReplyRef = (id: string): RefCallback<HTMLDivElement> => (element) => {
    replyRefs.current[id] = element;
  };

  // Загрузка отзывов с сохранением позиции
  const fetchReviewsAndMaintainPosition = async (targetId: string) => {
    setLastInteractedElementId(targetId);
    
    // Сохраняем текущую позицию прокрутки
    const scrollPosition = window.scrollY;
    
    // Устанавливаем состояние загрузки
    setLoading(true);
    
    // Загружаем отзывы
    try {
      const response = await fetch(`/api/reviews?specialistId=${specialistId}`);
      
      if (!response.ok) {
        throw new Error('Не удалось загрузить отзывы');
      }
      
      const data = await response.json();
      setReviews(data);
      
      // Даём компоненту перерисоваться перед восстановлением позиции
      setTimeout(() => {
        // Восстанавливаем позицию скролла к нужному элементу
        const targetElement = reviewRefs.current[targetId] || replyRefs.current[targetId];
        if (targetElement) {
          targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          // Если целевой элемент не найден, восстанавливаем позицию скролла
          window.scrollTo(0, scrollPosition);
        }
      }, 100);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка при загрузке отзывов');
    } finally {
      // Завершаем состояние загрузки
      setLoading(false);
    }
  };
  
  // Обычная загрузка отзывов при монтировании
  const fetchReviews = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/reviews?specialistId=${specialistId}`);
      
      if (!response.ok) {
        throw new Error('Не удалось загрузить отзывы');
      }
      
      const data = await response.json();
      setReviews(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка при загрузке отзывов');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    // При первом монтировании просто загружаем отзывы
    fetchReviews();
  }, [specialistId]);
  
  // Обработчик клика вне области эмодзи-пикера
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      let clickedInsidePicker = false;

      // Проверяем, был ли клик внутри какого-либо эмодзи-пикера
      Object.entries(emojiPickerRefs.current).forEach(([reviewId, ref]) => {
        if (ref && ref.contains(event.target as Node)) {
          clickedInsidePicker = true;
        }
      });

      if (!clickedInsidePicker) {
        setShowEmojiPicker({});
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Обработчик успешного добавления отзыва
  const handleReviewSuccess = (review: ReviewType) => {
    // Добавляем новый отзыв в локальное состояние без перезагрузки с сервера
    setReviews(prevReviews => [review, ...prevReviews]);
    setShowAddReviewForm(false);
    
    // Показываем уведомление об успешном добавлении
    toastService.success('Отзыв успешно опубликован');
    
    // Даем время для перерисовки DOM
    setTimeout(() => {
      // Прокручиваем к новому отзыву
      const newReviewElement = document.getElementById(`review-${review.id}`);
      if (newReviewElement) {
        newReviewElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 300);
  };
  
  // Оптимизируем обработчик изменения текста
  const handleReplyTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    e.persist(); // Предотвращаем синтетические события от сборки мусора
    dispatchReplyText({ type: 'SET_TEXT', payload: e.target.value });
  };
  
  // Обновляем логику очистки текста
  const clearReplyText = () => {
    dispatchReplyText({ type: 'CLEAR_TEXT' });
  };
  
  // Обновляем обработчик добавления эмодзи
  const handleEmojiClick = (emoji: string, reviewId: string) => {
    if (replyInputRef.current) {
      const start = replyInputRef.current.selectionStart || 0;
      const end = replyInputRef.current.selectionEnd || 0;
      
      // Сохраняем текущее состояние прокрутки
      const scrollTop = replyInputRef.current.scrollTop;
      
      // Вставляем эмодзи в текст
      const text = replyText;
      const newText = text.substring(0, start) + emoji + text.substring(end);
      dispatchReplyText({ type: 'SET_TEXT', payload: newText });
      
      // Устанавливаем курсор после вставленного эмодзи
      setTimeout(() => {
        if (replyInputRef.current) {
          replyInputRef.current.focus();
          
          // Восстанавливаем прокрутку
          replyInputRef.current.scrollTop = scrollTop;
          
          // Устанавливаем позицию курсора
          const newCursorPosition = start + emoji.length;
          replyInputRef.current.selectionStart = newCursorPosition;
          replyInputRef.current.selectionEnd = newCursorPosition;
        }
      }, 0);
    } else {
      dispatchReplyText({ type: 'SET_TEXT', payload: replyText + emoji });
    }
    
    // Закрываем эмодзи-пикер
    setShowEmojiPicker({...showEmojiPicker, [reviewId]: false});
  };
  
  // Компонент для отображения эмодзи-пикера
  const EmojiPicker = ({ onEmojiClick, reviewId }: { onEmojiClick: (emoji: string) => void, reviewId: string }) => {
    const emojiGroups = [
      {
        category: 'Смайлы',
        emojis: ['😀', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰']
      },
      {
        category: 'Эмоции',
        emojis: ['😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '😏']
      },
      {
        category: 'Реакции',
        emojis: ['❤️', '👍', '👎', '👏', '🙌', '👋', '✌️', '🤞', '🤝', '🎉', '👌', '😮', '🔥', '✨', '💯']
      }
    ];
    
    // Используем useRef для определения позиции пикера
    const pickerRef = useRef<HTMLDivElement>(null);
    const [pickerPosition, setPickerPosition] = useState<{top?: string, bottom?: string, left?: string, right?: string}>({
      bottom: '40px',
      left: '0'
    });
    
    // Определяем позицию пикера при монтировании
    useEffect(() => {
      if (pickerRef.current) {
        const rect = pickerRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;
        
        // Проверяем, выходит ли пикер за границы экрана
        const newPosition = { ...pickerPosition };
        
        // Проверка по вертикали
        if (rect.top < 0) {
          // Если пикер выходит за верхнюю границу, отображаем его ниже кнопки
          newPosition.bottom = undefined;
          newPosition.top = '40px';
        } else if (rect.bottom > viewportHeight) {
          // Если пикер выходит за нижнюю границу, отображаем его выше кнопки
          newPosition.top = undefined;
          newPosition.bottom = '40px';
        }
        
        // Проверка по горизонтали
        if (rect.right > viewportWidth) {
          // Если пикер выходит за правую границу, сдвигаем его влево
          newPosition.left = undefined;
          newPosition.right = '0';
        } else if (rect.left < 0) {
          // Если пикер выходит за левую границу, сдвигаем его вправо
          newPosition.right = undefined;
          newPosition.left = '0';
        }
        
        setPickerPosition(newPosition);
      }
    }, []);
    
    return (
      <div 
        ref={(el) => {
          emojiPickerRefs.current[reviewId] = el;
          pickerRef.current = el;
        }}
        className="bg-white rounded-lg shadow-lg p-4 w-[300px]"
        style={{ 
          position: 'absolute',
          ...(pickerPosition.top && { top: pickerPosition.top }),
          ...(pickerPosition.bottom && { bottom: pickerPosition.bottom }),
          ...(pickerPosition.left && { left: pickerPosition.left }),
          ...(pickerPosition.right && { right: pickerPosition.right }),
          zIndex: 50
        }}
      >
        <div className="max-h-[250px] overflow-y-auto px-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 scrollbar-thumb-rounded-md">
          {emojiGroups.map((group, groupIndex) => (
            <div key={groupIndex} className="mb-3">
              <h5 className="text-xs font-medium text-gray-500 mb-1">{group.category}</h5>
              <div className="grid grid-cols-8 gap-1">
                {group.emojis.map((emoji, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => onEmojiClick(emoji)}
                    className="text-xl hover:bg-gray-100 w-8 h-8 flex items-center justify-center rounded-md transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  // Обработчик клика по кнопке реакции
  const handleReactionClick = async (reviewId: string, reactionType: ReviewReactionType) => {
    if (!isAuthenticated || !user) {
      // Возвращаем простое перенаправление на страницу логина, пока не исправим ошибки
      window.location.href = '/login?returnUrl=' + encodeURIComponent(window.location.pathname);
      return;
    }

    // Формируем уникальный ключ для текущей реакции
    const reactionKey = `${reviewId}_${reactionType}`;
    
    // Проверяем, не обрабатывается ли уже эта реакция
    if (pendingReactions[reactionKey]) {
      console.log('Пропускаем повторный клик на реакцию, пока обрабатывается предыдущий');
      return;
    }
    
    try {
      // Устанавливаем флаг, что реакция в процессе обработки
      setPendingReactions(prev => ({ ...prev, [reactionKey]: true }));
      
      // Получаем текущий отзыв
      const reviewToUpdate = reviews.find(review => review.id === reviewId);
      if (!reviewToUpdate) return;
      
      // Проверяем, есть ли уже такая реакция от пользователя
      const existingReactionIndex = reviewToUpdate.reactions.findIndex(
        reaction => reaction.userId === user.id && reaction.type === reactionType
      );
      
      // Создаем копию реакций для обновления
      let updatedReactions = [...reviewToUpdate.reactions];
      
      if (existingReactionIndex >= 0) {
        // Если реакция уже есть - удаляем ее
        updatedReactions.splice(existingReactionIndex, 1);
      } else {
        // Если реакции нет - добавляем новую
        const newReaction = {
          id: `reaction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          userId: user.id,
          reviewId: reviewId,
          type: reactionType,
          createdAt: new Date().toISOString()
        };
        updatedReactions.push(newReaction);
      }
      
      // Создаем обновленную копию отзыва с новыми реакциями
      const updatedReview = {
        ...reviewToUpdate,
        reactions: updatedReactions
      };
      
      // Обновляем локальное состояние перед запросом на сервер
      setReviews(prevReviews => 
        prevReviews.map(review => 
          review.id === reviewId ? {...updatedReview} as ReviewType : review
        )
      );

      // Отправляем запрос на сервер
      const response = await fetch(`/api/reviews/${reviewId}/reaction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Добавляем передачу куки авторизации
        body: JSON.stringify({
          type: reactionType
        })
      });

      if (!response.ok) {
        throw new Error('Не удалось обновить реакцию');
      }
      
      // Получаем ответ от сервера и обновляем состояние с актуальными данными
      const responseData = await response.json();
      
      // Обновляем полностью данные отзыва из ответа сервера
      setReviews(prevReviews => 
        prevReviews.map(review => 
          review.id === reviewId ? responseData : review
        )
      );
      
    } catch (error) {
      console.error('Ошибка при обновлении реакции:', error);
      toastService.error('Не удалось обновить реакцию. Попробуйте позже.');
      // В случае ошибки загружаем все данные снова, чтобы восстановить правильное состояние
      fetchReviews();
    } finally {
      // Снимаем флаг обработки реакции
      setPendingReactions(prev => ({ ...prev, [reactionKey]: false }));
    }
  };

  // Обновляем обработчик отправки ответа
  const handleReplySubmit = async (reviewId: string) => {
    if (!replyText.trim()) return;
    
    if (!isAuthenticated) {
      // Сохраняем текущую позицию прокрутки и идентификатор отзыва
      const scrollPosition = window.scrollY;
      sessionStorage.setItem('reviewScrollPosition', scrollPosition.toString());
      sessionStorage.setItem('reviewId', reviewId);
      
      // Используем модальное окно вместо перенаправления
      showLoginModal(window.location.pathname, () => {
        // После успешной авторизации восстанавливаем позицию прокрутки
        const savedPosition = sessionStorage.getItem('reviewScrollPosition');
        const savedReviewId = sessionStorage.getItem('reviewId');
        
        if (savedPosition) {
          window.scrollTo({
            top: parseInt(savedPosition),
            behavior: 'smooth'
          });
        }
        
        // Если есть сохраненный идентификатор отзыва, фокусируемся на нем
        if (savedReviewId && reviewRefs.current[savedReviewId]) {
          setTimeout(() => {
            const element = reviewRefs.current[savedReviewId];
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 100);
        }
        
        // Очищаем сохраненные данные
        sessionStorage.removeItem('reviewScrollPosition');
        sessionStorage.removeItem('reviewId');
      });
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch(`/api/reviews/${reviewId}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          text: replyText,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Не удалось отправить ответ');
      }
      
      // Очищаем поле ввода ответа
      dispatchReplyText({ type: 'CLEAR_TEXT' });
      setReplyingTo(null);
      
      // Обновляем отзывы с сохранением позиции
      fetchReviewsAndMaintainPosition(reviewId);
      toastService.success('Ваш ответ успешно добавлен');
      
    } catch (error) {
      console.error('Ошибка при отправке ответа:', error);
      toastService.error('Произошла ошибка при отправке ответа');
    } finally {
      setLoading(false);
    }
  };

  // Обновляем обработчик ответа на ответ
  const handleReplyToReply = async (reviewId: string, parentReplyId: string) => {
    if (!replyText.trim()) return;
    
    if (!isAuthenticated) {
      // Сохраняем текущую позицию прокрутки и идентификаторы для возврата
      const scrollPosition = window.scrollY;
      sessionStorage.setItem('reviewScrollPosition', scrollPosition.toString());
      sessionStorage.setItem('reviewId', reviewId);
      sessionStorage.setItem('replyId', parentReplyId);
      
      // Используем модальное окно вместо перенаправления
      showLoginModal(window.location.pathname, () => {
        // После успешной авторизации восстанавливаем позицию прокрутки
        const savedPosition = sessionStorage.getItem('reviewScrollPosition');
        const savedReplyId = sessionStorage.getItem('replyId');
        
        if (savedPosition) {
          window.scrollTo({
            top: parseInt(savedPosition),
            behavior: 'smooth'
          });
        }
        
        // Если есть сохраненный идентификатор ответа, фокусируемся на нем
        if (savedReplyId && replyRefs.current[savedReplyId]) {
          setTimeout(() => {
            const element = replyRefs.current[savedReplyId];
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 100);
        }
        
        // Очищаем сохраненные данные
        sessionStorage.removeItem('reviewScrollPosition');
        sessionStorage.removeItem('reviewId');
        sessionStorage.removeItem('replyId');
      });
      return;
    }
    
    // Проверяем наличие пользователя
    if (!user) {
      console.error('Пользователь не авторизован или данные пользователя отсутствуют');
      toastService.error('Для отправки ответа необходимо авторизоваться');
      return;
    }
    
    try {
      const reviewToUpdate = reviews.find(review => review.id === reviewId);
      if (!reviewToUpdate) return;
      
      // Сохраняем текст ответа в локальной переменной 
      const replyTextToSend = replyText;
      
      // Очищаем состояние
      clearReplyText();
      setReplyingTo(null);
      setReplyingToReply(null);
      
      // Устанавливаем индикатор загрузки
      setLoading(true);
      
      // Отправляем запрос на сервер
      const response = await fetch(`/api/reviews/${reviewId}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          text: replyTextToSend,
          parentReplyId: parentReplyId
        })
      });
      
      if (!response.ok) {
        throw new Error('Не удалось отправить ответ');
      }
      
      // Получаем данные с сервера
      const responseData = await response.json();
      
      // Обновляем отзывы с сохранением позиции
      fetchReviewsAndMaintainPosition(reviewId);
      toastService.success('Ваш ответ успешно добавлен');
      
    } catch (error) {
      console.error('Ошибка при отправке ответа:', error);
      toastService.error('Произошла ошибка при отправке ответа. Пожалуйста, попробуйте позже.');
      // В случае ошибки перезагружаем все данные
      fetchReviews();
    } finally {
      setLoading(false);
    }
  };
  
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
  
  // Подсчет среднего рейтинга
  const averageRating = reviews.length > 0 
    ? Math.round(reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length * 10) / 10
    : 0;
  
  // Функция для преобразования типа реакции в иконку
  const getReactionIcon = (type: ReviewReactionType) => {
    switch (type) {
      case ReviewReactionType.LIKE:
        return <FaThumbsUp className="text-blue-500" />;
      case ReviewReactionType.LOVE:
        return <FaHeart className="text-red-500" />;
      case ReviewReactionType.THANKS:
        return <MdOutlineWavingHand className="text-green-500" />;
      case ReviewReactionType.WOW:
        return <RiEmotionLaughLine className="text-yellow-500" />;
      case ReviewReactionType.SAD:
        return <MdOutlineMoodBad className="text-purple-500" />;
      default:
        return <FaThumbsUp className="text-blue-500" />;
    }
  };

  // Проверка, поставил ли пользователь определенную реакцию
  const hasUserReaction = (reactions: any[], reactionType: ReviewReactionType) => {
    if (!user) return false;
    return reactions.some(reaction => reaction.userId === user.id && reaction.type === reactionType);
  };

  // Получение количества реакций определенного типа
  const getReactionCount = (reactions: any[], reactionType: ReviewReactionType) => {
    return reactions.filter(reaction => reaction.type === reactionType).length;
  };
  
  // Функция для открытия модального окна с увеличенным изображением
  const openImageModal = (imageUrl: string, reviewId: string) => {
    // Находим текущий отзыв
    const review = reviews.find(r => r.id === reviewId);
    if (!review) return;
    
    // Получаем все изображения из отзыва
    const allImages = review.attachments
      ?.filter(att => att.type === 'image')
      .map(att => att.url) || [];
    
    const imageIndex = allImages.indexOf(imageUrl);
    
    setSelectedImage(imageUrl);
    setCurrentReviewImages(allImages);
    setCurrentImageIndex(imageIndex >= 0 ? imageIndex : 0);
    setShowImageModal(true);
  };

  // Функция для навигации по изображениям в модальном окне
  const navigateImages = (direction: 'next' | 'prev') => {
    if (currentReviewImages.length <= 1) return;
    
    let newIndex;
    if (direction === 'next') {
      newIndex = (currentImageIndex + 1) % currentReviewImages.length;
    } else {
      newIndex = (currentImageIndex - 1 + currentReviewImages.length) % currentReviewImages.length;
    }
    
    setCurrentImageIndex(newIndex);
    setSelectedImage(currentReviewImages[newIndex]);
  };

  // Функция для закрытия модального окна с изображением
  const closeImageModal = () => {
    setShowImageModal(false);
    setSelectedImage(null);
  };

  // Обработчик редактирования отзыва
  const handleEditReview = (review: ReviewType) => {
    setReviewToEdit(review);
    setShowAddReviewForm(true);
  };

  // Обработчик удаления отзыва
  const handleDeleteReview = async (reviewId: string) => {
    try {
      const response = await fetch(`/api/reviews/${reviewId}`, {
        method: 'DELETE',
        credentials: 'include', // Добавляем передачу куки авторизации
      });

      if (!response.ok) {
        throw new Error('Не удалось удалить отзыв');
      }

      // Обновляем список отзывов
      fetchReviews();
      setShowDeleteConfirm(null);
      toastService.success('Отзыв успешно удален');
    } catch (err) {
      console.error('Ошибка при удалении отзыва:', err);
      toastService.error('Ошибка при удалении отзыва');
    }
  };

  // Проверка прав на редактирование отзыва
  const canEditReview = (review: ReviewType) => {
    if (!user) return false;
    return review.userId === user.id;
  };

  // Проверка прав на удаление отзыва
  const canDeleteReview = (review: ReviewType) => {
    if (!user) return false;
    return review.userId === user.id || user.role === UserRole.ADMIN;
  };

  // Добавляем отладочные выводы
  useEffect(() => {
    console.log("isAuthenticated изменился:", isAuthenticated);
  }, [isAuthenticated]);

  // Отслеживаем изменения в списке отзывов
  useEffect(() => {
    console.log("Список отзывов обновлен:", reviews.length);
    if (reviews.length > 0) {
      console.log("Первый отзыв:", reviews[0].id, reviews[0].text?.substring(0, 30));
    }
  }, [reviews]);

  return (
    <div ref={reviewsContainerRef} id="reviews-section" className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <h2 className="text-2xl font-bold mb-6">Отзывы о специалисте</h2>
      
      {/* Статистика отзывов */}
      <div className="flex items-center justify-between mb-6 border-b pb-4">
        <div>
          <div className="flex items-center mb-2">
            <span className="text-3xl font-bold">{averageRating}</span>
            <div className="flex ml-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <FaStar
                  key={star}
                  className={star <= Math.round(averageRating) ? "text-yellow-400" : "text-gray-300"}
                  size={18}
                />
              ))}
            </div>
          </div>
          <div className="text-sm text-gray-500">
            На основе {reviews.length} {
              reviews.length === 1 ? 'отзыва' :
              reviews.length >= 2 && reviews.length <= 4 ? 'отзывов' :
              reviews.length >= 5 && reviews.length <= 20 ? 'отзывов' :
              reviews.length % 10 === 1 ? 'отзыва' :
              reviews.length % 10 >= 2 && reviews.length % 10 <= 4 ? 'отзывов' : 'отзывов'
            }
          </div>
        </div>
        
        <button
          onClick={() => {
            if (isAuthenticated) {
              setShowAddReviewForm(!showAddReviewForm);
            } else {
              // Используем модальное окно вместо перенаправления
              showLoginModal(window.location.pathname, () => {
                setShowAddReviewForm(true);
              });
            }
          }}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors"
        >
          {isAuthenticated && showAddReviewForm ? 'Отменить' : 'Оставить отзыв'}
        </button>
      </div>
      
      {/* Форма добавления отзыва */}
      {showAddReviewForm && (
        <div className="mb-8">
          <ReviewForm
            specialistId={specialistId}
            specialistName={specialistName}
            onSuccess={handleReviewSuccess}
            hideForm={() => {
              setShowAddReviewForm(false);
              setReviewToEdit(undefined);
            }}
            reviewToEdit={reviewToEdit}
          />
        </div>
      )}
      
      {/* Модальное окно для просмотра увеличенных изображений */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-90 p-4"
          onClick={() => {
            setSelectedImage(null);
            setCurrentReviewImages([]);
            setCurrentImageIndex(0);
                  }}
                >
          {/* Удалено модальное окно для просмотра изображений */}
        </div>
      )}
      
      {/* Модальное окно подтверждения удаления */}
      {showDeleteConfirm && (
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
                onClick={() => handleDeleteReview(showDeleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Список отзывов */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-700 p-4 rounded-md">
          <p>{error}</p>
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">
            У этого специалиста пока нет отзывов. Будьте первым, кто оставит отзыв!
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {reviews.map((review) => {
            // Проверяем, что отзыв имеет ID
            if (!review.id) {
              console.error('Отзыв без ID:', review);
              return null;
            }
            
            return (
            <div 
                key={`review-${review.id}`}
                id={`review-${review.id}`}
              className="bg-[#faf7f2] rounded-lg shadow-md p-6 mb-8 border border-[#f0ece4] hover:shadow-lg transition-shadow"
              ref={createReviewRef(review.id)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  {review.user?.avatar ? (
                    <div className="w-12 h-12 rounded-full overflow-hidden mr-4 border-2 border-[#f0ece4]">
                      <Image 
                        src={review.user.avatar} 
                        alt={`${review.user?.firstName || 'Пользователь'} ${review.user?.lastName || ''}`}
                        width={48} 
                        height={48}
                        className="object-cover w-full h-full"
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4 text-blue-500">
                      <FaUser size={20} />
                    </div>
                  )}
                  <div>
                    <div className="font-semibold text-lg">
                      {review.user?.firstName || 'Пользователь'} {review.user?.lastName || ''}
                    </div>
                    <div className="text-sm text-gray-500 flex items-center mt-1">
                      <FaCalendarAlt className="mr-1" size={12} />
                      {formatDate(review.createdAt)}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Кнопки редактирования и удаления */}
                  {(canEditReview(review) || canDeleteReview(review)) && (
                    <div className="flex space-x-2 mr-3">
                      {canEditReview(review) && (
                        <button
                          onClick={() => handleEditReview(review)}
                          className="p-2 text-gray-500 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
                          title="Редактировать отзыв"
                        >
                          <FaEdit size={16} />
                        </button>
                      )}
                      
                      {canDeleteReview(review) && (
                        <button
                          onClick={() => setShowDeleteConfirm(review.id)}
                          className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                          title="Удалить отзыв"
                        >
                          <FaTrash size={16} />
                        </button>
                      )}
                    </div>
                  )}
                  
                  {/* Рейтинг */}
                  <div className="bg-[#f0ece4] p-2 rounded-lg">
                    <StarRating rating={review.rating} size="sm" className="mb-0" />
                  </div>
                </div>
              </div>
              
              {/* Отображение услуги */}
              {review.serviceName && review.serviceName !== 'Без услуги' && (
                <div className="mt-2 mb-3">
                  <a 
                    href={`/services/${review.serviceId}`}
                    className="inline-block px-3 py-1.5 bg-blue-100 text-blue-700 text-sm rounded-md hover:bg-blue-200 transition-colors cursor-pointer"
                  >
                    Услуга: {review.serviceName}
                  </a>
                </div>
              )}
              
              <div className="mt-4 text-gray-800 text-lg leading-relaxed">
                <p>{review.text}</p>
              </div>
              
              {/* Статус публикации */}
              {!review.isPublished && (
                <div className="mt-2 text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded inline-block">
                  На модерации
                </div>
              )}
              
              {/* Вложения */}
              {review.attachments && review.attachments.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                    {/* Удалено отображение изображений в отзывах */}
                </div>
              )}
              
              {/* Секция с реакциями */}
              <div className="mt-4 pt-3 border-t border-gray-100">
                <div className="flex flex-wrap gap-2">
                  <motion.button
                    onClick={() => handleReactionClick(review.id, ReviewReactionType.LIKE)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors ${
                      hasUserReaction(review.reactions || [], ReviewReactionType.LIKE)
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    whileTap={{ scale: 0.9 }}
                    whileHover={{ scale: 1.05 }}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  >
                    <FaThumbsUp size={12} />
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={getReactionCount(review.reactions || [], ReviewReactionType.LIKE)}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.2 }}
                      >
                        {getReactionCount(review.reactions || [], ReviewReactionType.LIKE)}
                      </motion.span>
                    </AnimatePresence>
                  </motion.button>
                  
                  <motion.button
                    onClick={() => handleReactionClick(review.id, ReviewReactionType.LOVE)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors ${
                      hasUserReaction(review.reactions || [], ReviewReactionType.LOVE)
                        ? 'bg-red-100 text-red-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    whileTap={{ scale: 0.9 }}
                    whileHover={{ scale: 1.05 }}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.05 }}
                  >
                    <FaHeart size={12} />
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={getReactionCount(review.reactions || [], ReviewReactionType.LOVE)}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.2 }}
                      >
                        {getReactionCount(review.reactions || [], ReviewReactionType.LOVE)}
                      </motion.span>
                    </AnimatePresence>
                  </motion.button>
                  
                  <motion.button
                    onClick={() => handleReactionClick(review.id, ReviewReactionType.THANKS)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors ${
                      hasUserReaction(review.reactions || [], ReviewReactionType.THANKS)
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    whileTap={{ scale: 0.9 }}
                    whileHover={{ scale: 1.05 }}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
                  >
                    <MdOutlineWavingHand size={14} />
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={getReactionCount(review.reactions || [], ReviewReactionType.THANKS)}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.2 }}
                      >
                        {getReactionCount(review.reactions || [], ReviewReactionType.THANKS)}
                      </motion.span>
                    </AnimatePresence>
                  </motion.button>
                  
                  <motion.button
                    onClick={() => handleReactionClick(review.id, ReviewReactionType.WOW)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors ${
                      hasUserReaction(review.reactions || [], ReviewReactionType.WOW)
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    whileTap={{ scale: 0.9 }}
                    whileHover={{ scale: 1.05 }}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.15 }}
                  >
                    <RiEmotionLaughLine size={14} />
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={getReactionCount(review.reactions || [], ReviewReactionType.WOW)}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.2 }}
                      >
                        {getReactionCount(review.reactions || [], ReviewReactionType.WOW)}
                      </motion.span>
                    </AnimatePresence>
                  </motion.button>
                  
                  <motion.button
                    onClick={() => handleReactionClick(review.id, ReviewReactionType.SAD)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors ${
                      hasUserReaction(review.reactions || [], ReviewReactionType.SAD)
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    whileTap={{ scale: 0.9 }}
                    whileHover={{ scale: 1.05 }}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.2 }}
                  >
                    <MdOutlineMoodBad size={14} />
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={getReactionCount(review.reactions || [], ReviewReactionType.SAD)}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.2 }}
                      >
                        {getReactionCount(review.reactions || [], ReviewReactionType.SAD)}
                      </motion.span>
                    </AnimatePresence>
                  </motion.button>
                </div>
              </div>
              
              {/* Кнопка ответа - теперь видима для всех */}
              {review.isPublished && (
                <div className="mt-4">
                  <button
                    onClick={() => {
                      if (isAuthenticated) {
                        setReplyingTo(review.id);
                      } else {
                        // Используем модальное окно вместо перенаправления
                        showLoginModal(window.location.pathname, () => {
                          setReplyingTo(review.id);
                        });
                      }
                    }}
                    className="text-sm text-blue-700 hover:text-blue-900 flex items-center bg-[#f0ece4] hover:bg-[#e8e4dc] px-4 py-2 rounded-md transition-colors"
                  >
                    <FaReply className="mr-2" size={14} />
                    Ответить
                  </button>
                </div>
              )}
              
              {/* Форма для ответа */}
              {replyingTo === review.id && (
                <div className="mt-5 bg-[#f8f6f0] p-5 rounded-lg relative border border-[#f0ece4] shadow-sm">
                  <button 
                    onClick={() => {
                      setReplyingTo(null); 
                      setReplyText('');
                    }}
                    className="absolute right-3 top-3 text-gray-500 hover:text-gray-700 bg-white p-2 rounded-full hover:bg-[#f0ece4] transition-colors"
                  >
                    <FaTimes size={16} />
                  </button>
                  <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                    <FaReply className="mr-2" size={14} />
                    Ответ на отзыв {review.user?.firstName} {review.user?.lastName}
                  </h4>
                  <div className="relative">
                    <textarea
                      ref={replyInputRef}
                      value={replyText}
                      onChange={handleReplyTextChange}
                      placeholder="Напишите ваш ответ..."
                      className="w-full p-3 border border-[#f0ece4] rounded-md focus:ring-blue-500 focus:border-blue-500 resize-none min-h-[120px] bg-white"
                    />
                    <div className="absolute bottom-3 right-3 flex items-center">
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowEmojiPicker({
                            ...showEmojiPicker,
                            [review.id]: !showEmojiPicker[review.id]
                          })}
                          className="flex items-center justify-center w-10 h-10 bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-colors shadow-md"
                          title="Добавить эмодзи"
                        >
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M8 14C8 14 9.5 16 12 16C14.5 16 16 14 16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M9 9H9.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M15 9H15.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                        {showEmojiPicker[review.id] && (
                          <div className="relative">
                            <EmojiPicker 
                              onEmojiClick={(emoji) => handleEmojiClick(emoji, review.id)}
                              reviewId={review.id}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end mt-4">
                    <button
                      onClick={() => replyingToReply 
                        ? handleReplyToReply(review.id, replyingToReply) 
                        : handleReplySubmit(review.id)
                      }
                      className="px-5 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium shadow-sm hover:shadow"
                    >
                      Отправить
                    </button>
                  </div>
                </div>
              )}
              
              {/* Ответы на отзыв */}
              {review.replies && review.replies.length > 0 && (
                <div className="mt-6 ml-5 pl-5 border-l-2 border-[#f0ece4] space-y-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                    Ответы ({review.replies.length})
                  </h4>
                  
                  {review.replies.map((reply) => (
                    <div 
                      key={reply.id} 
                      className="bg-[#f8f6f0] rounded-lg p-4 shadow-sm border border-[#f0ece4]"
                      ref={createReplyRef(reply.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center">
                          {reply.userAvatar ? (
                            <div className="w-10 h-10 rounded-full overflow-hidden mr-3 border border-[#f0ece4]">
                              <Image 
                                src={reply.userAvatar} 
                                alt={reply.userName || 'Пользователь'} 
                                width={40} 
                                height={40}
                                className="object-cover w-full h-full"
                              />
                            </div>
                          ) : (
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3 text-blue-500">
                              <FaUser className="text-blue-500" size={16} />
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-sm">
                              {reply.userName || 'Пользователь'}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {formatDate(reply.createdAt)}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-3 text-sm text-gray-700 pl-12">
                        <p>{reply.text}</p>
                      </div>
                      
                      {/* Добавляем кнопку ответить для каждого ответа */}
                      <div className="mt-3 pl-12">
                        <button
                          onClick={() => {
                            if (isAuthenticated) {
                              setReplyingTo(reply.id);
                            } else {
                              // Используем модальное окно вместо перенаправления
                              showLoginModal(window.location.pathname, () => {
                                setReplyingTo(reply.id);
                              });
                            }
                          }}
                          className="text-xs text-blue-700 hover:text-blue-900 flex items-center bg-[#f0ece4] hover:bg-[#e8e4dc] px-3 py-1.5 rounded-md transition-colors"
                        >
                          <FaReply className="mr-1.5" size={10} />
                          Ответить
                        </button>
                      </div>
                      
                      {/* Форма для ответа на ответ */}
                      {replyingTo === reply.id && (
                        <div className="mt-3 ml-12 border border-blue-200 rounded-lg p-4 bg-white shadow-sm">
                          <div className="flex justify-between items-center mb-3">
                            <h4 className="text-xs font-medium text-blue-700">Ваш ответ</h4>
                            <button
                              onClick={() => {
                                setReplyingTo(null);
                                clearReplyText();
                                setShowEmojiPicker({});
                              }}
                              className="text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-full p-1.5 transition-colors"
                            >
                              <FaTimes size={12} />
                            </button>
                          </div>
                          
                          <div className="relative">
                            <textarea
                              ref={replyInputRef}
                              value={replyText}
                              onChange={handleReplyTextChange}
                              className="w-full p-3 border border-blue-200 rounded-md focus:ring-blue-500 focus:border-blue-500 resize-none"
                              rows={2}
                              placeholder="Напишите ваш ответ..."
                            />
                            
                            <div className="flex justify-between items-center mt-3">
                              <div className="flex items-center gap-2">
                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={() => setShowEmojiPicker(prev => ({
                                      ...prev,
                                      [reply.id]: !prev[reply.id]
                                    }))}
                                    className="flex items-center justify-center w-10 h-10 bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-colors shadow-md"
                                    title="Добавить эмодзи"
                                  >
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                      <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                      <path d="M8 14C8 14 9.5 16 12 16C14.5 16 16 14 16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                      <path d="M9 9H9.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                      <path d="M15 9H15.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                  </button>
                                  
                                  {showEmojiPicker[reply.id] && (
                                    <div className="relative">
                                      <EmojiPicker 
                                        onEmojiClick={(emoji) => handleEmojiClick(emoji, reply.id)}
                                        reviewId={reply.id}
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              <button
                                onClick={() => handleReplyToReply(review.id, reply.id)}
                                disabled={!replyText.trim()}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                                  replyText.trim() 
                                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                }`}
                              >
                                Отправить
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}