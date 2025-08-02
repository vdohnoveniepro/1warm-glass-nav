
import React from 'react';
import { Link } from 'react-router-dom';
import { 
  BookOpenText, 
  Calendar, 
  FileText, 
  User, 
  Star, 
  MessageCircle, 
  ShieldCheck, 
  BrainCircuit,
  Users
} from 'lucide-react';
import Layout from '@/components/layout/Layout';
import TileButton from '@/components/ui/TileButton';
import { Button } from '@/components/ui/button';

const Index = () => {
  return (
    <Layout className="flex flex-col items-center justify-start">
      <div className="animate-fade-in w-full">
        {/* Header Section */}
        <div className="mb-6 text-center">
          <div className="inline-block px-3 py-1 bg-warmbeige-100 text-warmgray-700 rounded-full text-xs font-medium mb-3">
            Центр духовного развития
          </div>
          <h1 className="text-2xl font-semibold mb-2 text-warmgray-800">
            Ваш путь к внутренней гармонии
          </h1>
          <p className="text-warmgray-600 text-sm">
            Откройте для себя мир духовных практик
          </p>
        </div>

        {/* Main tiles grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <TileButton 
            icon={BookOpenText}
            title="Услуги"
            description="Наши практики"
            to="/services"
            color="indigo"
          />
          <TileButton 
            icon={Calendar}
            title="Записаться"
            description="Консультация"
            to="/book"
            color="purple"
          />
          <TileButton 
            icon={Users}
            title="Специалисты"
            description="Наша команда"
            to="/specialists"
            color="teal"
          />
          <TileButton 
            icon={FileText}
            title="Статьи"
            description="Полезные материалы"
            to="/articles"
            color="pink"
          />
          <TileButton 
            icon={User}
            title="Кабинет"
            description="Личный профиль"
            to="/profile"
            color="amber"
          />
        </div>

        {/* Featured section */}
        <div className="mb-6">
          <h2 className="text-lg font-medium text-warmgray-800 mb-3">Популярные услуги</h2>
          <div className="space-y-2">
            <FeaturedItem 
              title="Первая консультация" 
              description="Бесплатно • 30 минут"
              icon={Star}
              to="/services/1"
            />
            <FeaturedItem 
              title="ВсеЛенская терапия" 
              description="4000₽ • 2 часа"
              icon={BrainCircuit}
              to="/services/2"
            />
            <FeaturedItem 
              title="Таро" 
              description="2500₽ • 1 час"
              icon={MessageCircle}
              to="/services/3"
            />
          </div>
        </div>

        {/* Upcoming event banner */}
        <div className="rounded-xl p-4 bg-gradient-to-r from-pink-100/70 to-purple-100/70 backdrop-blur border border-pink-100 mb-6">
          <div className="flex items-start">
            <div className="bg-white/80 rounded-lg p-2 mr-3">
              <Calendar className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <h3 className="font-medium text-purple-800">Вебинар по нумерологии</h3>
              <p className="text-sm text-purple-700">15 июня • 19:00</p>
              <Link to="/events">
                <Button variant="link" className="p-0 h-auto text-purple-600 mt-1">
                  Подробнее
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Footer section */}
        <div className="text-center">
          <p className="text-xs text-warmgray-500">
            © 2023 Вдохновение • Центр духовного развития
          </p>
        </div>
      </div>
    </Layout>
  );
};

// Featured item component
const FeaturedItem = ({ 
  title, 
  description, 
  icon: Icon, 
  to 
}: { 
  title: string; 
  description: string; 
  icon: React.ElementType; 
  to: string;
}) => {
  return (
    <Link to={to} className="block">
      <div className="flex items-center p-3 rounded-lg frosted-glass hover:shadow-md transition-all">
        <div className="mr-3 p-2 rounded-lg bg-white/50">
          <Icon className="w-5 h-5 text-indigo-500" />
        </div>
        <div>
          <h3 className="font-medium text-warmgray-800">{title}</h3>
          <p className="text-xs text-warmgray-600">{description}</p>
        </div>
      </div>
    </Link>
  );
};

export default Index;
