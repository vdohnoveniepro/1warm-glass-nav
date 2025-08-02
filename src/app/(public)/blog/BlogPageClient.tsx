'use client';
export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from 'react';
import { useSearchParamsWrapper } from '@/lib/hooks/useSearchParamsWrapper';
import Link from 'next/link';
import { FaSearch, FaFilter, FaTimes } from 'react-icons/fa';
import BlogPreview from '@/components/BlogPreview';
import Pagination from '@/components/Pagination';
import { Article } from '@/components/Blog/types';
import BlogCategoryFilter from './BlogCategoryFilter';

function BlogPageClientContent() {
  const searchParams = useSearchParamsWrapper();
  
  // Состояния
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  
  // Параметры фильтрации и пагинации
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  
  // Получаем параметры из URL при загрузке
  useEffect(() => {
    const category = searchParams.get('category');
    const tag = searchParams.get('tag');
    const search = searchParams.get('search');
    const page = searchParams.get('page');
    
    if (category) setSelectedCategory(category);
    if (tag) setSelectedTag(tag);
    if (search) setSearchQuery(search);
    if (page) setCurrentPage(Number(page));
    
    fetchArticles(
      category || null, 
      tag || null, 
      search || '', 
      page ? Number(page) : 1
    );
    
    // Загружаем категории и теги при первой загрузке
    fetchCategoriesAndTags();
  }, [searchParams]);
  
  // Функция для загрузки статей
  const fetchArticles = async (
    category: string | null = selectedCategory, 
    tag: string | null = selectedTag, 
    query: string = searchQuery, 
    page: number = currentPage
  ) => {
    setIsLoading(true);
    
    try {
      // Формируем URL с параметрами
      let url = '/api/articles/public?';
      
      if (category) url += `category=${encodeURIComponent(category)}&`;
      if (tag) url += `tag=${encodeURIComponent(tag)}&`;
      if (query) url += `search=${encodeURIComponent(query)}&`;
      
      url += `page=${page}&limit=9`; // показываем по 9 статей на странице
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Ошибка при загрузке статей');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setArticles(data.data);
        setTotalPages(data.meta?.totalPages || 1);
      } else {
        throw new Error(data.error || 'Ошибка при загрузке данных');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка при загрузке статей');
      console.error('Error fetching articles:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Функция для загрузки категорий и тегов
  const fetchCategoriesAndTags = async () => {
    try {
      // Загружаем категории
      const categoriesResponse = await fetch('/api/categories');
      if (categoriesResponse.ok) {
        const categoriesData = await categoriesResponse.json();
        if (categoriesData.success) {
          setCategories(categoriesData.data.map((cat: any) => cat.name));
        }
      }
      
      // Загружаем теги
      const tagsResponse = await fetch('/api/tags');
      if (tagsResponse.ok) {
        const tagsData = await tagsResponse.json();
        if (tagsData.success) {
          setTags(tagsData.data.map((tag: any) => tag.name));
        }
      }
    } catch (err) {
      console.error('Error fetching categories and tags:', err);
    }
  };
  
  // Обработчик поиска
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchArticles(selectedCategory, selectedTag, searchQuery, 1);
  };
  
  // Обработчик сброса фильтров
  const handleResetFilters = () => {
    setSelectedCategory(null);
    setSelectedTag(null);
    setSearchQuery('');
    setCurrentPage(1);
    fetchArticles(null, null, '', 1);
  };
  
  // Обработчик изменения страницы
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchArticles(selectedCategory, selectedTag, searchQuery, page);
    
    // Прокручиваем страницу вверх
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };
  
  // Форматирование данных для компонента BlogPreview
  const formatArticlesForPreview = () => {
    return articles.map(article => ({
      id: article.id,
      title: article.title,
      preview: article.excerpt || '',
      imageUrl: article.image || '/images/blog-placeholder.jpg',
      date: article.publishedAt || article.createdAt,
      author: article.author?.name || 'Автор',
      tags: article.tags?.map(tag => typeof tag === 'string' ? tag : tag.name) || []
    }));
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">Блог центра "Вдохновение"</h1>
        <p className="text-gray-600 max-w-2xl">
          Полезные статьи и советы от наших специалистов. Узнайте больше о психологии, саморазвитии и здоровье.
        </p>
      </div>
      
      {/* Поиск и фильтры */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <form onSubmit={handleSearch} className="flex w-full md:w-auto">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по статьям..."
              className="border border-gray-300 rounded-l-lg px-4 py-2 w-full md:w-80 focus:outline-none focus:ring-2 focus:ring-[#48a9a6]"
            />
            <button 
              type="submit"
              className="bg-[#48a9a6] text-white px-4 py-2 rounded-r-lg hover:bg-[#3a8a87] transition-colors"
            >
              <FaSearch />
            </button>
          </form>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <FaFilter className="text-[#48a9a6]" />
              <span>{showFilters ? 'Скрыть фильтры' : 'Показать фильтры'}</span>
            </button>
            
            {(selectedCategory || selectedTag || searchQuery) && (
              <button
                onClick={handleResetFilters}
                className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
              >
                <FaTimes />
                <span>Сбросить</span>
              </button>
            )}
          </div>
        </div>
        
        {/* Фильтры по категориям и тегам */}
        {showFilters && (
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="mb-4">
              <h3 className="font-medium mb-2">Категории:</h3>
              <div className="flex flex-wrap gap-2">
                {categories.map(category => (
                  <button
                    key={category}
                    onClick={() => {
                      setSelectedCategory(selectedCategory === category ? null : category);
                      setCurrentPage(1);
                      fetchArticles(
                        selectedCategory === category ? null : category,
                        selectedTag,
                        searchQuery,
                        1
                      );
                    }}
                    className={`px-3 py-1 rounded-full text-sm ${
                      selectedCategory === category
                        ? 'bg-[#48a9a6] text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    } transition-colors`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Теги:</h3>
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => {
                      setSelectedTag(selectedTag === tag ? null : tag);
                      setCurrentPage(1);
                      fetchArticles(
                        selectedCategory,
                        selectedTag === tag ? null : tag,
                        searchQuery,
                        1
                      );
                    }}
                    className={`px-3 py-1 rounded-full text-sm ${
                      selectedTag === tag
                        ? 'bg-[#48a9a6] text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    } transition-colors`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Текущие фильтры */}
      {(selectedCategory || selectedTag || searchQuery) && (
        <div className="mb-6 p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-blue-700">
            <span>Активные фильтры:</span>
            {selectedCategory && (
              <span className="bg-blue-100 px-2 py-1 rounded">
                Категория: {selectedCategory}
              </span>
            )}
            {selectedTag && (
              <span className="bg-blue-100 px-2 py-1 rounded">
                Тег: #{selectedTag}
              </span>
            )}
            {searchQuery && (
              <span className="bg-blue-100 px-2 py-1 rounded">
                Поиск: "{searchQuery}"
              </span>
            )}
          </div>
        </div>
      )}
      
      {/* Отображение ошибки */}
      {error && (
        <div className="p-4 mb-6 bg-red-100 border-l-4 border-red-500 text-red-700 rounded">
          <p>{error}</p>
          <button
            onClick={handleResetFilters}
            className="mt-2 text-sm font-medium hover:underline"
          >
            Сбросить фильтры и попробовать снова
          </button>
        </div>
      )}
      
      {/* Индикатор загрузки */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-[#48a9a6] border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-gray-600">Загрузка статей...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Список статей */}
          {articles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {formatArticlesForPreview().map((post, index) => (
                <BlogPreview key={post.id || index} post={post} />
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <h3 className="text-xl font-medium text-gray-800 mb-2">
                Статьи не найдены
              </h3>
              <p className="text-gray-600 mb-4">
                По вашему запросу не найдено ни одной статьи.
              </p>
              <button
                onClick={handleResetFilters}
                className="px-4 py-2 bg-[#48a9a6] text-white rounded-lg hover:bg-[#3a8a87] transition-colors"
              >
                Сбросить фильтры
              </button>
            </div>
          )}
          
          {/* Пагинация */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-8">
              <Pagination 
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function BlogPageClient() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-[50vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#48a9a6]"></div>
          <p className="ml-3 text-gray-600">Загрузка блога...</p>
        </div>
      </div>
    }>
      <BlogPageClientContent />
    </Suspense>
  );
}