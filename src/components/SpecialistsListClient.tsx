"use client";

import Image from 'next/image';
import { FaSpinner, FaUserMd } from 'react-icons/fa';
import SpecialistCard from './SpecialistCard';

interface Specialist {
  id: string;
  firstName: string;
  lastName: string;
  position: string;
  experience: number;
  description?: string | null;
  photo: string;
  services: any[];
  rating?: number;
  reviewCount?: number;
  reviewsCount?: number;
  order?: number;
}

interface Service {
  id: string;
  name: string;
  color: string;
}

interface Props {
  specialists: Specialist[];
  services: Service[];
  reviews: any[];
}

export default function SpecialistsListClient({ specialists, services, reviews }: Props) {
  // Отображение ошибки
  if (!specialists || !Array.isArray(specialists)) {
    console.error('SpecialistsListClient: specialists не является массивом:', specialists);
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h3 className="text-red-700 font-medium mb-2">Ошибка загрузки</h3>
          <p className="text-red-600">Не удалось загрузить специалистов</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  // Если нет специалистов
  if (!specialists || specialists.length === 0) {
    return (
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-center mb-8">Наши специалисты</h1>
        <div className="flex justify-center items-center min-h-[40vh]">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 max-w-md text-center">
            <FaUserMd className="text-amber-500 text-4xl mx-auto mb-4" />
            <h3 className="text-amber-700 font-medium mb-2">Специалисты не найдены</h3>
            <p className="text-amber-600">В настоящее время информация о специалистах недоступна</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-center mb-8">Наши специалисты</h1>
      {/* Список специалистов */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {specialists.map((specialist) => (
          <SpecialistCard 
            key={specialist.id} 
            specialist={{
              ...specialist,
              reviewCount: specialist.reviewsCount || 0
            }}
          />
        ))}
      </div>
    </div>
  );
} 