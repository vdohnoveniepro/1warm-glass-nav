
import React from 'react';
import { Link } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Users, Star, MessageCircle } from 'lucide-react';

// Моки данных для специалистов
const specialistsData = [
  {
    id: 1,
    name: 'Анна Морозова',
    title: 'ВсеЛенский терапевт',
    image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&h=200&auto=format&fit=crop',
    rating: 4.9,
    reviews: 48,
    specialties: ['нумерология', 'таро', 'регрессия'],
  },
  {
    id: 2,
    name: 'Михаил Светлов',
    title: 'Мастер Таро',
    image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=200&h=200&auto=format&fit=crop',
    rating: 4.8,
    reviews: 36,
    specialties: ['таро', 'астрология', 'медитация'],
  },
  {
    id: 3,
    name: 'Елена Звездная',
    title: 'Астролог',
    image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=200&h=200&auto=format&fit=crop',
    rating: 4.7,
    reviews: 29,
    specialties: ['астрология', 'нумерология', 'коучинг'],
  },
];

const Specialists = () => {
  return (
    <Layout className="flex flex-col items-start justify-start pb-20">
      <div className="w-full animate-fade-in">
        {/* Заголовок */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-warmgray-800">Наши специалисты</h1>
          <p className="text-warmgray-600">Опытные практики в различных сферах духовного развития</p>
        </div>
        
        {/* Список специалистов */}
        <div className="space-y-4 w-full">
          {specialistsData.map((specialist) => (
            <Link
              key={specialist.id}
              to={`/specialists/${specialist.id}`}
              className="block"
            >
              <div className="frosted-glass rounded-lg p-4 flex items-center hover:shadow-md transition-all">
                <div className="mr-4 shrink-0">
                  <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white/70">
                    <img 
                      src={specialist.image} 
                      alt={specialist.name} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-warmgray-800">{specialist.name}</h3>
                  <p className="text-sm text-warmgray-600">{specialist.title}</p>
                  <div className="flex items-center mt-1">
                    <Star className="w-4 h-4 text-amber-500 mr-1" />
                    <span className="text-xs text-warmgray-700 mr-2">{specialist.rating}</span>
                    <MessageCircle className="w-4 h-4 text-warmgray-500 mr-1" />
                    <span className="text-xs text-warmgray-700">{specialist.reviews} отзывов</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {specialist.specialties.map((specialty, index) => (
                      <span 
                        key={index} 
                        className="text-xs bg-warmpeach-100 text-warmgray-700 px-2 py-1 rounded-full"
                      >
                        {specialty}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default Specialists;
