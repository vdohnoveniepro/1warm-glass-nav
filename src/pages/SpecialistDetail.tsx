
import React from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import { Calendar, Star, MessageCircle, Clock, Award, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Моки данных для специалистов
const specialistsData = [
  {
    id: 1,
    name: 'Анна Морозова',
    title: 'ВсеЛенский терапевт',
    image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=350&h=350&auto=format&fit=crop',
    rating: 4.9,
    reviews: 48,
    specialties: ['нумерология', 'таро', 'регрессия'],
    experience: '8 лет',
    sessions: 520,
    description: 'Анна практикует ВсеЛенскую терапию более 8 лет. Помогает клиентам раскрыть свой внутренний потенциал и найти истинное предназначение. Специализируется на нумерологии, регрессивном гипнозе и раскладах Таро.',
    education: [
      'Международная Академия Духовного Развития, 2015',
      'Сертифицированный мастер таро, 2016',
      'Нумеролог-практик, 2017'
    ],
    services: [
      { id: 1, name: 'Консультация по нумерологии', duration: '60 мин', price: '2500₽' },
      { id: 2, name: 'Расклад Таро', duration: '90 мин', price: '3500₽' },
      { id: 3, name: 'ВсеЛенская терапия', duration: '120 мин', price: '5000₽' }
    ]
  },
  {
    id: 2,
    name: 'Михаил Светлов',
    title: 'Мастер Таро',
    image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=350&h=350&auto=format&fit=crop',
    rating: 4.8,
    reviews: 36,
    specialties: ['таро', 'астрология', 'медитация'],
    experience: '6 лет',
    sessions: 410,
    description: 'Михаил — опытный таролог с уникальной методикой чтения карт. Помогает разобраться в сложных жизненных ситуациях, определить причины проблем и найти эффективные решения. Практикует медитативные техники для гармонизации энергетики.',
    education: [
      'Школа Таро и Эзотерики, 2017',
      'Курс "Медитативные практики Востока", 2018',
      'Астрология натальных карт, 2019'
    ],
    services: [
      { id: 1, name: 'Полный расклад Таро', duration: '90 мин', price: '3000₽' },
      { id: 2, name: 'Натальная карта', duration: '120 мин', price: '4000₽' },
      { id: 3, name: 'Медитативный сеанс', duration: '60 мин', price: '2000₽' }
    ]
  },
  {
    id: 3,
    name: 'Елена Звездная',
    title: 'Астролог',
    image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=350&h=350&auto=format&fit=crop',
    rating: 4.7,
    reviews: 29,
    specialties: ['астрология', 'нумерология', 'коучинг'],
    experience: '5 лет',
    sessions: 320,
    description: 'Елена — профессиональный астролог и нумеролог. Составляет персональные гороскопы, помогает разобраться в сложных жизненных ситуациях. Применяет индивидуальный подход к каждому клиенту, сочетая методики астрологии и коучинга.',
    education: [
      'Московская Школа Астрологии, 2018',
      'Академия Нумерологии, 2019',
      'Курс "Трансформационный коучинг", 2020'
    ],
    services: [
      { id: 1, name: 'Персональный гороскоп', duration: '90 мин', price: '3500₽' },
      { id: 2, name: 'Нумерологический разбор', duration: '60 мин', price: '2700₽' },
      { id: 3, name: 'Коучинг-сессия', duration: '120 мин', price: '4500₽' }
    ]
  }
];

const SpecialistDetail = () => {
  const { id } = useParams<{ id: string }>();
  const specialistId = parseInt(id || '1');
  
  // Находим специалиста по id
  const specialist = specialistsData.find(s => s.id === specialistId);
  
  if (!specialist) {
    return (
      <Layout>
        <div className="text-center py-10">
          <h2 className="text-xl font-medium">Специалист не найден</h2>
          <Link to="/specialists" className="text-indigo-600 mt-4 inline-block">
            Вернуться к списку специалистов
          </Link>
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout className="pb-20">
      <div className="animate-fade-in w-full">
        {/* Навигация назад */}
        <Link to="/specialists" className="inline-flex items-center text-indigo-600 mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Назад к специалистам
        </Link>
        
        {/* Профиль специалиста */}
        <div className="frosted-glass rounded-lg p-5 mb-6">
          <div className="flex items-center">
            <div className="mr-4 shrink-0">
              <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-white/70">
                <img 
                  src={specialist.image} 
                  alt={specialist.name} 
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-semibold text-warmgray-800">{specialist.name}</h1>
              <p className="text-warmgray-600">{specialist.title}</p>
              
              <div className="flex items-center mt-2">
                <Star className="w-4 h-4 text-amber-500 mr-1" />
                <span className="text-sm text-warmgray-700 mr-2">{specialist.rating}</span>
                <MessageCircle className="w-4 h-4 text-warmgray-500 mr-1" />
                <span className="text-sm text-warmgray-700">{specialist.reviews} отзывов</span>
              </div>
              
              <div className="flex gap-2 mt-3">
                <Button size="sm" className="bg-indigo-500 hover:bg-indigo-600">
                  <Calendar className="w-4 h-4 mr-1" />
                  Записаться
                </Button>
                <Button size="sm" variant="outline">
                  <MessageCircle className="w-4 h-4 mr-1" />
                  Написать
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Статистика */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="frosted-glass rounded-lg p-3 text-center">
            <Clock className="w-5 h-5 mx-auto mb-1 text-indigo-500" />
            <p className="text-xs text-warmgray-600">Опыт</p>
            <p className="font-medium">{specialist.experience}</p>
          </div>
          <div className="frosted-glass rounded-lg p-3 text-center">
            <Calendar className="w-5 h-5 mx-auto mb-1 text-purple-500" />
            <p className="text-xs text-warmgray-600">Сессий</p>
            <p className="font-medium">{specialist.sessions}+</p>
          </div>
          <div className="frosted-glass rounded-lg p-3 text-center">
            <Award className="w-5 h-5 mx-auto mb-1 text-pink-500" />
            <p className="text-xs text-warmgray-600">Рейтинг</p>
            <p className="font-medium">{specialist.rating}</p>
          </div>
        </div>
        
        {/* О специалисте */}
        <div className="mb-6">
          <h2 className="text-lg font-medium text-warmgray-800 mb-2">О специалисте</h2>
          <div className="frosted-glass rounded-lg p-4">
            <p className="text-warmgray-700 text-sm">{specialist.description}</p>
          </div>
        </div>
        
        {/* Образование */}
        <div className="mb-6">
          <h2 className="text-lg font-medium text-warmgray-800 mb-2">Образование</h2>
          <div className="frosted-glass rounded-lg p-4">
            <ul className="text-sm space-y-2">
              {specialist.education.map((edu, index) => (
                <li key={index} className="flex items-start">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 mr-2"></div>
                  <span className="text-warmgray-700">{edu}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        
        {/* Услуги */}
        <div className="mb-6">
          <h2 className="text-lg font-medium text-warmgray-800 mb-2">Услуги</h2>
          <div className="space-y-3">
            {specialist.services.map((service) => (
              <div key={service.id} className="frosted-glass rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-warmgray-800">{service.name}</h3>
                    <div className="flex items-center mt-1">
                      <Clock className="w-4 h-4 text-warmgray-500 mr-1" />
                      <span className="text-xs text-warmgray-600">{service.duration}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-warmgray-800">{service.price}</p>
                    <Button size="sm" className="mt-2">Записаться</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SpecialistDetail;
