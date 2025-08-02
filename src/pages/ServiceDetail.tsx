
import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Clock, User, Calendar } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import AnimatedButton from '@/components/ui/AnimatedButton';

const ServiceDetail = () => {
  const { id } = useParams<{ id: string }>();
  
  // Sample service data (in a real app, you would fetch this based on the ID)
  const service = {
    id: id || '1',
    title: 'ВсеЛенская терапия',
    duration: '2 ч',
    price: '4000',
    specialist: 'Анна Иванова',
    description: `ВсеЛенская терапия – это глубокая проработка подсознательных блоков и ограничений, мешающих вам жить полноценной, счастливой жизнью. 

    Во время сеанса вы сможете:
    - Раскрыть причины эмоциональных и психологических проблем
    - Освободиться от негативных шаблонов мышления
    - Найти источник внутренних конфликтов
    - Восстановить энергетический баланс
    
    Терапия проводится в индивидуальном формате и адаптируется под ваши личные запросы.`,
    specialists: [
      { id: '1', name: 'Анна Иванова', experience: '8 лет' },
      { id: '2', name: 'Михаил Петров', experience: '5 лет' }
    ]
  };

  return (
    <Layout>
      <div className="animate-fade-in">
        {/* Back Button */}
        <Link 
          to="/services" 
          className="inline-flex items-center text-gray-600 hover:text-gray-800 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          <span>Назад к услугам</span>
        </Link>
        
        {/* Service Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold mb-3 text-gray-800">{service.title}</h1>
          
          <div className="flex items-center gap-4 mb-3">
            <div className="flex items-center text-gray-600">
              <Clock className="w-4 h-4 mr-1" />
              <span>{service.duration}</span>
            </div>
            <div className="font-medium text-indigo-600">{service.price} ₽</div>
          </div>
        </div>
        
        {/* Service Description */}
        <div className="frosted-glass rounded-xl p-5 mb-6">
          <h2 className="text-lg font-medium mb-3 text-gray-800">Описание</h2>
          <div className="text-gray-600 whitespace-pre-line">
            {service.description}
          </div>
        </div>
        
        {/* Specialists */}
        <div className="frosted-glass rounded-xl p-5 mb-8">
          <h2 className="text-lg font-medium mb-3 text-gray-800">Специалисты</h2>
          
          <div className="space-y-4">
            {service.specialists.map((specialist) => (
              <div key={specialist.id} className="flex items-center justify-between p-3 bg-white/60 rounded-lg">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mr-3">
                    <User className="w-5 h-5 text-indigo-500" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-800">{specialist.name}</div>
                    <div className="text-xs text-gray-600">Опыт: {specialist.experience}</div>
                  </div>
                </div>
                <Link to={`/specialists/${specialist.id}`} className="text-sm text-indigo-500 font-medium">
                  Профиль
                </Link>
              </div>
            ))}
          </div>
        </div>
        
        {/* Book Button */}
        <Link to={`/book?service=${service.id}`} className="block">
          <AnimatedButton fullWidth className="flex items-center justify-center">
            <Calendar className="w-5 h-5 mr-2" />
            Записаться на прием
          </AnimatedButton>
        </Link>
      </div>
    </Layout>
  );
};

export default ServiceDetail;
