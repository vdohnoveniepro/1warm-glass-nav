'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import { FaPlus, FaEdit, FaEye, FaTrash, FaSearch, FaComments } from 'react-icons/fa';
import { useSearchParamsWrapper } from '@/lib/hooks/useSearchParamsWrapper';

interface Article {
  id: string;
  title: string;
  slug: string;
  banner: string;
  excerpt: string;
  category: string;
  status: 'draft' | 'published';
  views: number;
  createdAt: string;
  updatedAt: string;
  commentsCount?: number;
}

export default function ArticlesClient() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParamsWrapper();
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoadingArticles, setIsLoadingArticles] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    // Загрузка статей специалиста
    const fetchSpecialistArticles = async () => {
      if (!user) {
        console.log('Пользователь не авторизован');
        setIsLoadingArticles(false);
        return;
      }
      
      // Определяем ID специалиста
      let specialistId = user.specialistId;
      
      // Для пользователя bakeevd@yandex.ru используем известный ID специалиста
      if (user.email === 'bakeevd@yandex.ru') {
        specialistId = '6f60fb81-335e-426c-94e2-53bc8f8417e9';
      }
      
      console.log('Загрузка статей для специалиста:', specialistId);
      setIsLoadingArticles(true);
      setApiError(null);
      
      try {
        // Запрашиваем статьи по ID специалиста
        const response = await fetch(`/api/articles?specialistId=${specialistId}`);
        console.log('Статус ответа API:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Получены данные:', data);
          
          if (data.success && Array.isArray(data.data)) {
            setArticles(data.data);
          } else {
            setArticles([]);
            setApiError('Не удалось получить статьи');
          }
        } else {
          console.error('Ошибка запроса:', response.statusText);
          setApiError(`Ошибка запроса: ${response.statusText}`);
        }
      } catch (error) {
        console.error('Ошибка при загрузке статей:', error);
        setApiError('Ошибка при загрузке статей');
      } finally {
        setIsLoadingArticles(false);
      }
    };

    if (!isLoading) {
      fetchSpecialistArticles();
    }
  }, [user, isLoading]);

  const handleDelete = async (articleId: string) => {
    if (confirm('Вы уверены, что хотите удалить эту статью?')) {
      try {
        const response = await fetch(`/api/articles/${articleId}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          toast.success('Статья успешно удалена');
          setArticles(articles.filter(article => article.id !== articleId));
        } else {
          toast.error('Не удалось удалить статью');
        }
      } catch (error) {
        console.error('Ошибка при удалении статьи:', error);
        toast.error('Произошла ошибка при удалении статьи');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-10 min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#48a9a6]"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-4">Управление статьями</h1>
        <p className="text-red-500">Для доступа к управлению статьями необходимо авторизоваться</p>
        <button 
          onClick={() => router.push('/login')} 
          className="mt-4 px-4 py-2 bg-[#48a9a6] text-white rounded hover:bg-[#3a8a87]"
        >
          Войти
        </button>
      </div>
    );
  }

  return (
    <div className="px-2 sm:px-4 md:px-6 py-4 bg-white rounded-lg shadow-md">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold">Управление статьями</h1>
        <Link href="/admin/articles/add" className="px-4 py-2 bg-[#48a9a6] text-white rounded flex items-center hover:bg-[#3a8a87] w-full sm:w-auto justify-center sm:justify-start">
          <FaPlus className="mr-2" /> Добавить статью
        </Link>
      </div>

      {isLoadingArticles ? (
        <div className="flex justify-center items-center p-10 min-h-[50vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#48a9a6]"></div>
        </div>
      ) : apiError ? (
        <div className="p-4 bg-red-100 text-red-700 rounded mb-4">
          <p>{apiError}</p>
        </div>
      ) : articles.length === 0 ? (
        <div className="p-4 bg-gray-100 rounded text-center">
          <p className="text-gray-600">У вас пока нет статей</p>
          <Link href="/admin/articles/add" className="mt-2 inline-block px-4 py-2 bg-[#48a9a6] text-white rounded hover:bg-[#3a8a87]">
            Создать первую статью
          </Link>
        </div>
      ) : (
        <>
          {/* Поиск и фильтры */}
          <div className="mb-4 flex flex-col sm:flex-row gap-2">
            <div className="relative flex-grow">
              <input
                type="text"
                placeholder="Поиск по статьям..."
                className="w-full p-2 border border-gray-300 rounded pl-10"
              />
              <FaSearch className="absolute left-3 top-3 text-gray-400" />
            </div>
            <select className="p-2 border border-gray-300 rounded sm:ml-2 w-full sm:w-auto">
              <option value="all">Все статьи</option>
              <option value="published">Опубликованные</option>
              <option value="draft">Черновики</option>
            </select>
          </div>

          {/* Список статей */}
          <div className="grid grid-cols-1 gap-4">
            {articles.map((article) => (
              <div key={article.id} className="border p-3 rounded-lg hover:shadow-md transition-shadow flex flex-col md:flex-row gap-3">
                <div className="md:w-1/4">
                  {article.banner ? (
                    <Image
                      src={article.banner}
                      alt={article.title}
                      width={300}
                      height={200}
                      className="w-full h-40 object-cover rounded"
                    />
                  ) : (
                    <div className="w-full h-40 bg-gray-200 rounded flex items-center justify-center">
                      <span className="text-gray-500">Нет изображения</span>
                    </div>
                  )}
                </div>
                <div className="md:w-3/4 flex flex-col">
                  <div className="flex-grow">
                    <h2 className="text-xl font-semibold mb-2">{article.title}</h2>
                    <p className="text-gray-600 mb-2 line-clamp-2">{article.excerpt}</p>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        article.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {article.status === 'published' ? 'Опубликовано' : 'Черновик'}
                      </span>
                      <span className="text-gray-500 text-sm">
                        {new Date(article.createdAt).toLocaleDateString()}
                      </span>
                      <span className="text-gray-500 text-sm flex items-center">
                        <FaEye className="mr-1" /> {article.views}
                      </span>
                      <span className="text-gray-500 text-sm flex items-center">
                        <FaComments className="mr-1" /> {article.commentsCount || 0}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Link
                      href={`/admin/articles/edit/${article.id}`}
                      className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center"
                    >
                      <FaEdit className="mr-1" /> 
                      <span className="md:inline">Редактировать</span>
                    </Link>
                    <Link
                      href={`/articles/${article.slug}`}
                      className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600 flex items-center"
                    >
                      <FaEye className="mr-1" /> 
                      <span className="md:inline">Просмотр</span>
                    </Link>
                    <button
                      onClick={() => handleDelete(article.id)}
                      className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 flex items-center"
                    >
                      <FaTrash className="mr-1" /> 
                      <span className="md:inline">Удалить</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      
      {/* Добавляем дополнительный отступ внизу страницы */}
      <div className="pb-20"></div>
    </div>
  );
}
