import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { useAuth } from '@/lib/AuthContext';
import { FaReply, FaEdit, FaTrashAlt, FaThumbsUp, FaThumbsDown, FaUser, FaExclamationTriangle, FaImage, FaTimes } from 'react-icons/fa';
import { FaRegSmile } from 'react-icons/fa';
import LoginModal from '@/components/LoginModal';
import { processImageFromBase64 } from '@/lib/imageProcessing';

// Интерфейс для компонента выбора эмодзи
interface EmojiPickerProps {
  onEmojiClick: (emoji: string) => void;
}

// Компонент выбора эмодзи
const EmojiPicker: React.FC<EmojiPickerProps> = ({ onEmojiClick }) => {
  const [activeCategory, setActiveCategory] = useState(0);
  const [pickerPosition, setPickerPosition] = useState<{top?: string, bottom?: string, left?: string, right?: string}>({
    bottom: '40px',
    left: '0'
  });
  const pickerRef = useRef<HTMLDivElement>(null);
  
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
  
  // Категории эмодзи для более удобной навигации
  const emojiCategories = [
    {
      name: "Смайлы",
      emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘']
    },
    {
      name: "Животные",
      emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔']
    },
    {
      name: "Еда",
      emojis: ['🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍒', '🍑', '🥑', '🍕', '🍔', '🍟', '🍩', '🍦']
    },
    {
      name: "Активности",
      emojis: ['❤️', '👍', '👎', '👏', '🙌', '👋', '✌️', '🤞', '🤝', '🎉', '🎈', '🎁', '🏆', '⚽', '🥇']
    }
  ];
  
  return (
    <div 
      ref={pickerRef}
      className="bg-white rounded-lg shadow-lg p-4 absolute z-50"
      style={{
        ...(pickerPosition.top && { top: pickerPosition.top }),
        ...(pickerPosition.bottom && { bottom: pickerPosition.bottom }),
        ...(pickerPosition.left && { left: pickerPosition.left }),
        ...(pickerPosition.right && { right: pickerPosition.right }),
        width: '300px'
      }}
    >
      <div className="flex mb-2 border-b pb-2 gap-2">
        {emojiCategories.map((category, index) => (
          <button
            key={category.name}
            type="button"
            onClick={() => setActiveCategory(index)}
            className={`px-2 py-1 rounded-md text-sm ${
              activeCategory === index 
                ? 'bg-[#48a9a6] text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-8 gap-1">
        {emojiCategories[activeCategory].emojis.map((emoji, index) => (
          <button
            key={index}
            type="button"
            onClick={() => onEmojiClick(emoji)}
            className="text-xl hover:bg-gray-100 w-8 h-8 flex items-center justify-center rounded-md"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

export type Comment = {
  id: string;
  userId: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    photo?: string;
  };
  content: string;
  photo?: string | null;
  createdAt: string;
  updatedAt?: string;
  parentId: string | null;
  replies?: Comment[];
  reactions?: {
    type: string;
    userId: string;
    user?: {
      id: string;
      firstName: string;
      lastName: string;
      photo?: string;
    };
  }[];
  hasUserReacted?: {
    [key: string]: boolean;
  };
  reactionCounts?: {
    [key: string]: number;
  };
  // Для оптимистичных обновлений
  _isDeleting?: boolean;
  // Дополнительные поля для реакций
  likedBy?: string[];
  dislikedBy?: string[];
  likes?: number;
  dislikes?: number;
  // Дополнительные поля для пользователя
  userName?: string;
  userAvatar?: string;
};

interface CommentSectionProps {
  articleId: string;
}

const CommentSection: React.FC<CommentSectionProps> = ({ articleId }) => {
  const { isAuthenticated, showLoginModal, user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContents, setReplyContents] = useState<{[key: string]: string}>({});
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showReplyEmojiPicker, setShowReplyEmojiPicker] = useState<{[key: string]: boolean}>({});
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  
  // Удаляем состояния для фотографий
  
  const commentInputRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const replyEmojiPickerRef = useRef<HTMLDivElement>(null);
  
  // Добавляем ref для хранения ссылок на комментарии
  const commentRefs = useRef<{[key: string]: HTMLDivElement | null}>({});
  
  // Функция для создания ref callback для комментариев
  const setCommentRef = useCallback((element: HTMLDivElement | null, id: string) => {
    if (element) {
      commentRefs.current[id] = element;
    }
  }, []);
  
  // Функция для прокрутки к комментарию
  const scrollToComment = useCallback((commentId: string) => {
    setTimeout(() => {
      const commentElement = commentRefs.current[commentId];
      if (commentElement) {
        commentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  }, []);
  
  // Отладочный лог для проверки аутентификации
  useEffect(() => {
    console.log('Состояние аутентификации:', { 
      isAuthenticated, 
      userId: user?.id, 
      userName: user ? `${user.firstName} ${user.lastName}` : 'Нет',
      userRole: user?.role
    });
  }, [isAuthenticated, user]);

  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
      setShowEmojiPicker(false);
    }
    if (replyEmojiPickerRef.current && !replyEmojiPickerRef.current.contains(event.target as Node)) {
      setShowReplyEmojiPicker({});
    }
  }, []);
  
  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [handleClickOutside]);

  // Улучшаем функцию загрузки комментариев с повторными попытками
  useEffect(() => {
    let isMounted = true;
    let retryCount = 0;
    const maxRetries = 3;
    
    const fetchComments = async () => {
      try {
        setIsLoading(true);
        setError(null); // Сбрасываем ошибку перед каждой попыткой
        
        console.log(`Загрузка комментариев для статьи: ${articleId}, попытка ${retryCount + 1}`);
        const response = await fetch(`/api/comments?articleId=${articleId}`);
        
        if (response.ok) {
          // Комментарии получены успешно
          const data = await response.json();
          
          // Обрабатываем данные в новом формате - теперь API возвращает массив напрямую
          if (isMounted) {
            setComments(data || []);
            console.log(`Загружено ${data?.length || 0} комментариев`);
          }
        } else {
          const data = await response.json();
          throw new Error(data.error || 'Ошибка при загрузке комментариев');
        }
      } catch (error) {
        console.error('Ошибка при загрузке комментариев:', error);
        setError('Не удалось загрузить комментарии. Пожалуйста, попробуйте позже.');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    fetchComments();
    
    return () => {
      isMounted = false;
    };
  }, [articleId]);

  // Функция для отображения модального окна авторизации
  const showLogin = () => {
    showLoginModal(window.location.pathname);
  };

  // Отправка нового комментария
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      showLogin();
      return;
    }
    
    if (!newComment.trim()) return;
    
    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          content: newComment,
          articleId,
          parentId: null,
          // Удаляем photo из запроса
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Добавляем новый комментарий в список
        setComments(prevComments => [...prevComments, data]);
        setNewComment('');
        // Удаляем сброс фото
        
        // Прокручиваем к новому комментарию
        scrollToComment(data.id);
      } else {
        throw new Error(data.error || 'Ошибка при отправке комментария');
      }
    } catch (error) {
      console.error('Ошибка при отправке комментария:', error);
      setError((error as Error).message);
    }
  };

  // Отправка ответа на комментарий
  const handleSubmitReply = async (commentId: string) => {
    if (!isAuthenticated) {
      showLogin();
      return;
    }
    
    // Получаем значение из текущего состояния, а не из ref
    const currentReplyContent = replyContents[commentId] || '';
    
    if (!currentReplyContent.trim()) return;
    
    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          content: currentReplyContent,
          articleId,
          parentId: commentId,
          // Удаляем photo из запроса
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Обновляем комментарии, добавляя новый ответ
        const updateCommentsWithReply = (comments: Comment[]): Comment[] => {
          return comments.map(comment => {
            if (comment.id === commentId) {
              return {
                ...comment,
                replies: [...(comment.replies || []), data]
              };
            }
            if (comment.replies && comment.replies.length > 0) {
              return {
                ...comment,
                replies: updateCommentsWithReply(comment.replies)
              };
            }
            return comment;
          });
        };
        
        setComments(prevComments => updateCommentsWithReply(prevComments));
        setReplyingTo(null);
        setReplyContents(prev => ({ ...prev, [commentId]: '' }));
        // Удаляем сброс replyPhoto
        setShowReplyEmojiPicker({});
        
        // Прокручиваем к новому ответу
        scrollToComment(data.id);
        
        // Удаляем сброс input файла
      } else {
        throw new Error(data.error || 'Ошибка при отправке ответа');
      }
    } catch (error) {
      console.error('Ошибка при отправке ответа:', error);
      setError((error as Error).message);
    }
  };

  // Функция для удаления комментария после подтверждения
  const confirmDeleteComment = async (commentId: string) => {
    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Не удалось удалить комментарий');
      }
      
      const data = await response.json();
      if (data.success) {
        // Удаляем комментарий из состояния
        setComments(prevComments => {
          const removeComment = (comments: Comment[]): Comment[] => {
            return comments.filter(comment => {
              if (comment.id === commentId) {
                return false; // Удаляем этот комментарий
              }
              
              if (comment.replies && comment.replies.length > 0) {
                // Рекурсивно фильтруем ответы
                comment.replies = removeComment(comment.replies);
              }
              
              return true;
            });
          };
          
          return removeComment(prevComments);
        });
      } else {
        throw new Error(data.message || 'Ошибка при удалении комментария');
      }
    } catch (error) {
      console.error('Ошибка при удалении комментария:', error);
      setError((error as Error).message);
    } finally {
      // Закрываем модальное окно подтверждения удаления
      setShowDeleteConfirm(null);
    }
  };

  // Функция для редактирования комментария
  const handleEditComment = async (commentId: string) => {
    if (!editContent.trim()) return;
    
    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          content: editContent,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Не удалось обновить комментарий');
      }
      
      const data = await response.json();
      if (data.success) {
        // Обновляем состояние комментариев
        setComments(prevComments => {
          const updateEditedComment = (comments: Comment[]): Comment[] => {
            return comments.map(comment => {
              if (comment.id === commentId) {
                // Сохраняем текущие replies перед обновлением
                return {
                  ...data.data,
                  replies: comment.replies // Сохраняем существующие replies
                };
              } else if (comment.replies && comment.replies.length > 0) {
                // Рекурсивно проверяем ответы
                return {
                  ...comment,
                  replies: updateEditedComment(comment.replies),
                };
              }
              return comment;
            });
          };
          
          return updateEditedComment(prevComments);
        });
        
        setEditingComment(null);
        setEditContent('');
      } else {
        throw new Error(data.message || 'Ошибка при обновлении комментария');
      }
    } catch (error) {
      console.error('Ошибка при обновлении комментария:', error);
      setError((error as Error).message);
    }
  };

  // Функция для обработки лайков/дизлайков
  const handleReaction = async (commentId: string, reactionType: 'like' | 'dislike' | 'none') => {
    if (!isAuthenticated) {
      showLogin();
      return;
    }
    
    try {
      const response = await fetch(`/api/comments/${commentId}/reaction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          reaction: reactionType
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Обновляем реакции для комментария
        setComments(prevComments => {
          // Рекурсивная функция для обновления комментария на любом уровне вложенности
          const updateCommentReactions = (comments: Comment[]): Comment[] => {
            return comments.map(comment => {
              if (comment.id === commentId) {
                return { 
                  ...comment, 
                  likes: data.likes, 
                  dislikes: data.dislikes,
                  likedBy: data.likedBy,
                  dislikedBy: data.dislikedBy
                };
              }
              if (comment.replies && comment.replies.length > 0) {
                return {
                  ...comment,
                  replies: updateCommentReactions(comment.replies)
                };
              }
              return comment;
            });
          };
          
          return updateCommentReactions(prevComments);
        });
      } else {
        const data = await response.json();
        console.error('Ошибка при обновлении реакции:', data.error);
        setError(data.error || 'Не удалось обновить реакцию');
      }
    } catch (error) {
      console.error('Ошибка при обновлении реакции:', error);
      setError('Не удалось обновить реакцию. Проверьте подключение к интернету.');
    }
  };

  // Функция форматирования даты
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Компонент для отображения отдельного комментария
  const CommentItem = ({ comment, depth = 0 }: { comment: Comment, depth?: number }) => {
    const isOwner = isAuthenticated && user?.id === comment.userId;
    const isAdmin = isAuthenticated && user?.role === 'admin';
    const canModify = isOwner || isAdmin;
    const hasUserLiked = isAuthenticated && user?.id && comment.likedBy.includes(user.id);
    const hasUserDisliked = isAuthenticated && user?.id && comment.dislikedBy.includes(user.id);
    
    // Референс для textarea
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    
    // Эффект для установки курсора в конец текста при открытии формы ответа
    useEffect(() => {
      if (replyingTo === comment.id && textareaRef.current) {
        const textarea = textareaRef.current;
        const length = textarea.value.length;
        textarea.focus();
        textarea.selectionStart = length;
        textarea.selectionEnd = length;
      }
    }, [replyingTo, comment.id]);
    
    return (
      <div 
        className={`mb-4 ${comment._isDeleting ? 'opacity-50' : ''}`}
        id={`comment-${comment.id}`}
        ref={(el) => setCommentRef(el, comment.id)}
      >
        <div className={`bg-white rounded-lg shadow-sm p-3 md:p-4 ${depth > 0 ? 'border-l-2 border-[#48a9a6] ml-4 md:ml-8' : ''}`}>
          <div className="flex gap-2 md:gap-3">
            <div className="flex-shrink-0">
              {comment.userAvatar ? (
                <Image
                  src={comment.userAvatar}
                  alt={comment.userName}
                  width={36}
                  height={36}
                  className="rounded-full w-8 h-8 md:w-10 md:h-10"
                />
              ) : (
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#48a9a6] flex items-center justify-center text-white">
                  <FaUser />
                </div>
              )}
            </div>
            <div className="flex-grow min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 md:gap-2">
                <h4 className="font-semibold text-gray-800 text-sm md:text-base truncate max-w-[150px] sm:max-w-none">{comment.userName}</h4>
                <span className="text-xs text-gray-500">{formatDate(comment.createdAt)}</span>
                {comment.updatedAt && comment.updatedAt !== comment.createdAt && (
                  <span className="text-xs text-gray-400 italic">(изменено)</span>
                )}
              </div>
              
              <div className="mt-1 md:mt-2">
                {editingComment === comment.id ? (
                  <div>
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#48a9a6]"
                      rows={3}
                      autoFocus
                    />
                    <div className="flex justify-end gap-2 mt-2">
                      <button
                        onClick={() => setEditingComment(null)}
                        className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                      >
                        Отмена
                      </button>
                      <button
                        onClick={() => handleEditComment(comment.id)}
                        className="px-3 py-1 text-sm bg-[#48a9a6] text-white rounded hover:bg-[#3a8a87]"
                      >
                        Сохранить
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-gray-700 whitespace-pre-line text-sm md:text-base">{comment.content}</p>
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2 md:gap-4 mt-2 flex-wrap">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleReaction(comment.id, 'like')}
                    className={`p-1 rounded hover:bg-gray-100 ${hasUserLiked ? 'text-blue-600' : 'text-gray-500'}`}
                    title="Нравится"
                  >
                    <FaThumbsUp className="text-xs md:text-sm" />
                  </button>
                  <span className="text-xs text-gray-600">{comment.likes}</span>
                </div>
                
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleReaction(comment.id, 'dislike')}
                    className={`p-1 rounded hover:bg-gray-100 ${hasUserDisliked ? 'text-red-600' : 'text-gray-500'}`}
                    title="Не нравится"
                  >
                    <FaThumbsDown className="text-xs md:text-sm" />
                  </button>
                  <span className="text-xs text-gray-600">{comment.dislikes}</span>
                </div>
                
                <button
                  onClick={() => {
                    if (!isAuthenticated) {
                      showLogin();
                      return;
                    }
                    if (replyingTo === comment.id) {
                      setReplyingTo(null);
                    } else {
                      setReplyingTo(comment.id);
                    }
                  }}
                  className="text-[#48a9a6] text-xs md:text-sm hover:underline flex items-center"
                >
                  <FaReply className="mr-1" /> Ответить
                </button>
                
                {canModify && (
                  <div className="flex items-center gap-2 ml-auto">
                    {isOwner && (
                      <button
                        onClick={() => {
                          setEditingComment(comment.id);
                          setEditContent(comment.content);
                        }}
                        className="text-blue-600 text-xs md:text-sm hover:underline flex items-center"
                        title="Редактировать"
                      >
                        <FaEdit className="mr-1" />
                      </button>
                    )}
                    
                    <button
                      onClick={() => setShowDeleteConfirm(comment.id)}
                      className="text-red-600 text-xs md:text-sm hover:underline flex items-center"
                      title="Удалить"
                    >
                      <FaTrashAlt className="mr-1" />
                    </button>
                  </div>
                )}
              </div>
              
              {replyingTo === comment.id && (
                <div className="mt-3 w-full">
                  <textarea
                    ref={textareaRef}
                    value={replyContents[comment.id] || ''}
                    onChange={(e) => handleReplyContentChange(comment.id, e)}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#48a9a6] text-sm"
                    placeholder="Введите ваш ответ..."
                    rows={2}
                    autoFocus
                  />
                  
                  <div className="flex justify-between items-center mt-2 flex-wrap gap-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowReplyEmojiPicker({
                          ...showReplyEmojiPicker,
                          [comment.id]: !showReplyEmojiPicker[comment.id]
                        })}
                        className="flex items-center justify-center text-[#48a9a6] hover:text-[#3a8a87] w-8 h-8 rounded-full hover:bg-gray-100"
                        title="Добавить эмодзи"
                      >
                        <FaRegSmile size={16} />
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => {
                          setReplyingTo(null);
                          setReplyContents(prev => ({...prev, [comment.id]: ''}));
                        }}
                        className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                      >
                        Отмена
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSubmitReply(comment.id)}
                        className="px-2 py-1 text-xs bg-[#48a9a6] text-white rounded hover:bg-[#3a8a87]"
                      >
                        Отправить
                      </button>
                    </div>
                  </div>
                  
                  {showReplyEmojiPicker[comment.id] && (
                    <div 
                      ref={replyEmojiPickerRef}
                      className="relative mt-2"
                    >
                      <div className="absolute z-10 bg-white rounded-lg shadow-xl p-4 border">
                        <EmojiPicker onEmojiClick={(emoji) => handleReplyEmojiClick(emoji, comment.id)} />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Рекурсивно отображаем вложенные комментарии */}
        {comment.replies && comment.replies.length > 0 && (
          <div className={`mt-2 ${depth > 0 ? 'ml-4 md:ml-8' : 'ml-4 md:ml-8'}`}>
            {comment.replies.map(reply => (
              <CommentItem key={reply.id} comment={reply} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  // Вычисляем общее количество комментариев, включая ответы
  const getTotalCommentsCount = (comments: Comment[]): number => {
    let count = comments.length;
    
    for (const comment of comments) {
      if (comment.replies && comment.replies.length > 0) {
        count += getTotalCommentsCount(comment.replies);
      }
    }
    
    return count;
  };

  const totalCommentsCount = getTotalCommentsCount(comments);

  // Модальное окно подтверждения удаления
  const DeleteConfirmModal = ({ commentId }: { commentId: string }) => {
    // Находим комментарий, который нужно удалить
    const findComment = (comments: Comment[], id: string): Comment | null => {
      for (const comment of comments) {
        if (comment.id === id) {
          return comment;
        }
        if (comment.replies && comment.replies.length > 0) {
          const found = findComment(comment.replies, id);
          if (found) {
            return found;
          }
        }
      }
      return null;
    };
    
    const commentToDelete = findComment(comments, commentId);
    const hasReplies = commentToDelete?.replies && commentToDelete.replies.length > 0;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
          <div className="flex items-center text-amber-600 mb-4">
            <FaExclamationTriangle className="text-2xl mr-2" />
            <h3 className="text-lg font-bold">Подтверждение удаления</h3>
          </div>
          <p className="text-gray-700 mb-6">
            Вы уверены, что хотите удалить этот комментарий? Это действие невозможно отменить.
            {hasReplies && " Все ответы на этот комментарий также будут удалены."}
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowDeleteConfirm(null)}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={() => confirmDeleteComment(commentId)}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Удалить
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Обработчик добавления смайлика в комментарий
  const handleEmojiClick = (emoji: string) => {
    setNewComment(prev => prev + emoji);
    // Не закрываем панель после выбора, чтобы можно было добавить несколько эмодзи
  };

  // Обработчик добавления смайлика в ответ
  const handleReplyEmojiClick = (emoji: string, commentId: string) => {
    // Обновляем текст ответа в состоянии
    setReplyContents(prev => ({
      ...prev,
      [commentId]: (prev[commentId] || '') + emoji
    }));
    // Не закрываем панель после выбора
  };

  // Обработчик изменения текста ответа
  const handleReplyContentChange = (commentId: string, e: React.ChangeEvent<HTMLTextAreaElement>) => {
    // Сохраняем текущую позицию курсора и прокрутки
    const textarea = e.target;
    const selectionStart = textarea.selectionStart;
    const selectionEnd = textarea.selectionEnd;
    const scrollTop = textarea.scrollTop;
    
    // Обновляем текст в состоянии
    setReplyContents(prev => ({
      ...prev,
      [commentId]: e.target.value
    }));
    
    // После обновления состояния, восстанавливаем позицию курсора и прокрутки
    // Используем setTimeout, чтобы дать React время обновить DOM
    setTimeout(() => {
      if (textarea) {
        textarea.selectionStart = selectionStart;
        textarea.selectionEnd = selectionEnd;
        textarea.scrollTop = scrollTop;
      }
    }, 0);
  };

  return (
    <div className="mt-8 bg-gray-50 p-4 md:p-6 rounded-xl">
      <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6 text-gray-800 flex items-center">
        <FaReply className="mr-2 transform rotate-180" />
        Комментарии ({getTotalCommentsCount(comments)})
      </h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}
      
      {/* Форма для нового комментария */}
      <form onSubmit={handleSubmitComment} className="mb-6 md:mb-8">
        <div className="relative">
          <textarea
            ref={commentInputRef}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className={`w-full p-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#48a9a6] resize-none ${!isAuthenticated ? 'bg-gray-100 cursor-not-allowed' : ''}`}
            placeholder={isAuthenticated ? "Напишите ваш комментарий..." : "Войдите, чтобы оставить комментарий"}
            rows={4}
            disabled={!isAuthenticated}
            aria-label="Комментарий"
          />
          
          {!isAuthenticated && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 bg-opacity-70 rounded-lg">
              <p className="text-gray-700 mb-3 text-center">Чтобы написать комментарий, необходимо авторизоваться</p>
              <button
                type="button"
                onClick={showLogin}
                className="px-4 py-2 bg-[#48a9a6] text-white rounded-lg hover:bg-[#3a8a87] transition-colors"
              >
                Войти или зарегистрироваться
              </button>
            </div>
          )}
          
          {isAuthenticated && (
            <div className="flex mt-2 justify-between items-center">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="flex items-center justify-center text-[#48a9a6] hover:text-[#3a8a87] w-8 h-8 rounded-full hover:bg-gray-100"
                  title="Добавить эмодзи"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M8 14C8 14 9.5 16 12 16C14.5 16 16 14 16 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M9 9H9.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M15 9H15.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
              
              <button
                type="submit"
                className={`px-4 py-2 rounded-lg transition-colors ${
                  newComment.trim()
                    ? 'bg-[#48a9a6] text-white hover:bg-[#3a8a87]'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
                disabled={!newComment.trim()}
              >
                Отправить
              </button>
            </div>
          )}
          
          {showEmojiPicker && (
            <div 
              ref={emojiPickerRef}
              className="absolute z-10 mt-2 bg-white rounded-lg shadow-xl p-4 border"
            >
              <EmojiPicker onEmojiClick={handleEmojiClick} />
            </div>
          )}
        </div>
      </form>
      
      {isLoading ? (
        <div className="flex justify-center py-6 md:py-8">
          <div className="animate-spin rounded-full h-6 w-6 md:h-8 md:w-8 border-t-2 border-b-2 border-[#48a9a6]"></div>
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-6 md:py-8 text-gray-600 text-sm md:text-base">
          Пока нет комментариев. Будьте первым!
        </div>
      ) : (
        <div>
          {comments.map(comment => (
            <CommentItem key={comment.id} comment={comment} />
          ))}
        </div>
      )}
      
      {/* Модальное окно подтверждения удаления */}
      {showDeleteConfirm && <DeleteConfirmModal commentId={showDeleteConfirm} />}
    </div>
  );
};

export default CommentSection; 