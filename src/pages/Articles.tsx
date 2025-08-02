
import React from 'react';
import { Search } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import ArticleCard from '@/components/ui/ArticleCard';

const Articles = () => {
  // Sample articles data
  const articles = [
    { 
      id: '1', 
      title: 'Как правильно начать регрессивную терапию', 
      excerpt: 'Узнайте основные принципы регрессивной терапии и как она может помочь вам раскрыть глубинные причины психологических блоков.', 
      author: 'Мария Петрова', 
      date: '10 июня',
      imageUrl: 'https://images.unsplash.com/photo-1546484396-fb3fc6f95f98?q=80&w=1470&auto=format&fit=crop' 
    },
    { 
      id: '2', 
      title: 'Таро как инструмент самопознания', 
      excerpt: 'Карты Таро – это не только предсказание будущего, но и мощный инструмент для анализа собственного подсознания.', 
      author: 'Елена Смирнова', 
      date: '5 июня',
      imageUrl: 'https://images.unsplash.com/photo-1659535973636-88c0dcffa511?q=80&w=1374&auto=format&fit=crop' 
    },
    { 
      id: '3', 
      title: 'Практики очищения энергетического поля', 
      excerpt: 'Ежедневные практики, которые помогут вам поддерживать энергетическую чистоту и защиту от негативных воздействий.', 
      author: 'Сергей Козлов', 
      date: '1 июня',
      imageUrl: 'https://images.unsplash.com/photo-1616694547693-679dc0211215?q=80&w=1470&auto=format&fit=crop' 
    },
  ];

  // Categories
  const categories = [
    'Все', 'Регрессия', 'Таро', 'Нумерология', 'Астрология', 'Руны', 'Практики'
  ];

  // State for search, filtering and active category
  const [searchTerm, setSearchTerm] = React.useState('');
  const [activeCategory, setActiveCategory] = React.useState('Все');
  const [filteredArticles, setFilteredArticles] = React.useState(articles);

  // Handle search and category filter
  React.useEffect(() => {
    let filtered = articles;
    
    // Filter by search term
    if (searchTerm.trim() !== '') {
      filtered = filtered.filter(article => 
        article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        article.excerpt.toLowerCase().includes(searchTerm.toLowerCase()) ||
        article.author.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Filter by category
    if (activeCategory !== 'Все') {
      // This is a simplified example. In a real app, articles would have a category property
      // filtered = filtered.filter(article => article.category === activeCategory);
    }
    
    setFilteredArticles(filtered);
  }, [searchTerm, activeCategory]);

  return (
    <Layout>
      <div className="animate-fade-in">
        <h1 className="text-2xl font-semibold mb-6 text-warmgray-800">Статьи</h1>
        
        {/* Search */}
        <div className="relative mb-6">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-warmgray-400" />
          </div>
          <input
            type="text"
            placeholder="Поиск статей"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-3 w-full rounded-lg bg-white/70 backdrop-blur-sm border border-warmbeige-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
          />
        </div>
        
        {/* Categories */}
        <div className="mb-6 overflow-x-auto whitespace-nowrap -mx-4 px-4 pb-2">
          <div className="flex space-x-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                  activeCategory === category
                    ? 'bg-primary text-warmgray-800 shadow-sm'
                    : 'bg-warmbeige-100 text-warmgray-600 hover:bg-warmbeige-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
        
        {/* Articles List */}
        <div className="space-y-6">
          {filteredArticles.length > 0 ? (
            filteredArticles.map((article) => (
              <ArticleCard
                key={article.id}
                id={article.id}
                title={article.title}
                excerpt={article.excerpt}
                author={article.author}
                date={article.date}
                imageUrl={article.imageUrl}
              />
            ))
          ) : (
            <div className="text-center py-10 text-warmgray-600">
              <p>Статьи не найдены</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Articles;
