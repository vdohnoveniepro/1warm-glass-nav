'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { FaCalendarCheck, FaArrowLeft } from 'react-icons/fa';
import { useSearchParamsWrapper } from '@/lib/hooks/useSearchParamsWrapper';

export default function ThankYouClient() {
  const searchParams = useSearchParamsWrapper();
  const [appointmentId, setAppointmentId] = useState<string | null>(null);
  
  useEffect(() => {
    const id = searchParams.get('id');
    if (id) {
      setAppointmentId(id);
    }
  }, [searchParams]);

  return (
    <div className="container mx-auto py-16 px-4">
      <div className="max-w-2xl mx-auto text-center">
        <div className="flex justify-center mb-8">
          <div className="bg-green-100 rounded-full p-6 inline-flex">
            <FaCalendarCheck className="text-5xl text-green-600" />
          </div>
        </div>
        
        <h1 className="text-3xl md:text-4xl font-bold mb-6 text-gray-900 dark:text-white">
          Спасибо за вашу запись!
        </h1>
        
        <div className="prose prose-lg dark:prose-invert max-w-none mb-10">
          <p>
            Ваша заявка на запись успешно отправлена. Мы свяжемся с вами в ближайшее время 
            для подтверждения даты и времени.
          </p>
          
          {appointmentId && (
            <p className="text-gray-600 dark:text-gray-400">
              Номер вашей записи: <strong>{appointmentId}</strong>
            </p>
          )}
          
          <p className="text-gray-600 dark:text-gray-400">
            Вы получите уведомление на указанный email с подробностями вашего визита.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link 
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 border border-transparent 
                     text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700
                     transition-colors duration-300"
          >
            <FaArrowLeft className="mr-2" />
            На главную
          </Link>
          
          <Link 
            href="/services"
            className="inline-flex items-center justify-center px-6 py-3 border border-gray-300
                     text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50
                     dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700
                     transition-colors duration-300"
          >
            Просмотреть услуги
          </Link>
        </div>
      </div>
    </div>
  );
} 