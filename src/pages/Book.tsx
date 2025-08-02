
import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar as CalendarIcon, Clock, User, Check } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import AnimatedButton from '@/components/ui/AnimatedButton';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useMediaQuery } from '@/hooks/use-mobile';

const Book = () => {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const [searchParams] = useSearchParams();
  const serviceId = searchParams.get('service');
  const eventId = searchParams.get('event');
  
  // Step state (1: select service, 2: select specialist, 3: select date, 4: select time, 5: confirmation)
  const [step, setStep] = useState(serviceId || eventId ? 2 : 1);
  const [selectedService, setSelectedService] = useState<string | null>(serviceId);
  const [selectedSpecialist, setSelectedSpecialist] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  
  // Sample data
  const services = [
    { id: '1', title: 'Первая бесплатная консультация', duration: '30 мин', price: '0', image: '/images/services/consultation.jpg' },
    { id: '2', title: 'ВсеЛенская терапия', duration: '2 ч', price: '4000', image: '/images/services/therapy.jpg' },
    { id: '3', title: 'Легализация правды', duration: '2 ч', price: '4000', image: '/images/services/truth.jpg' },
    { id: '4', title: 'Таро', duration: '1 ч', price: '2500', image: '/images/services/tarot.jpg' },
    { id: '5', title: 'Регрессия', duration: '3 ч', price: '4000', image: '/images/services/regression.jpg' },
  ];
  
  const specialists = [
    { id: '1', name: 'Анна Иванова', photo: '/images/specialists/anna.jpg' },
    { id: '2', name: 'Михаил Петров', photo: '/images/specialists/mikhail.jpg' },
    { id: '3', name: 'Елена Смирнова', photo: '/images/specialists/elena.jpg' },
  ];
  
  const availableTimes = ['10:00', '12:00', '14:00', '16:00', '18:00'];
  
  // Handle service selection
  const handleServiceSelect = (id: string) => {
    setSelectedService(id);
    setStep(2);
  };
  
  // Handle specialist selection
  const handleSpecialistSelect = (id: string) => {
    setSelectedSpecialist(id);
    setStep(3);
  };
  
  // Handle date selection
  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) setStep(4);
  };
  
  // Handle time selection
  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setStep(5);
  };
  
  // Handle booking submission
  const handleBookingSubmit = () => {
    // Here you would integrate with your backend
    alert('Запись успешно создана!');
  };
  
  // Create calendar picker component
  const CalendarPicker = () => {
    return (
      <div className="frosted-glass rounded-lg overflow-hidden p-1">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleDateSelect}
          locale={ru}
          className="rounded-lg pointer-events-auto"
          disabled={date => 
            date < new Date(new Date().setHours(0, 0, 0, 0))
          }
        />
      </div>
    );
  };

  // Create time picker component
  const TimePicker = () => {
    return (
      <div className="grid grid-cols-2 gap-3">
        {availableTimes.map((time) => (
          <button
            key={time}
            onClick={() => handleTimeSelect(time)}
            className="flex justify-center items-center p-4 frosted-glass rounded-lg hover:shadow-md transition-all duration-300"
          >
            <Clock className="w-4 h-4 mr-2 text-indigo-500" />
            <span className="text-gray-800">{time}</span>
          </button>
        ))}
      </div>
    );
  };

  // Render step content
  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="animate-slide-in">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Выберите услугу</h2>
            <div className="space-y-3">
              {services.map((service) => (
                <button
                  key={service.id}
                  onClick={() => handleServiceSelect(service.id)}
                  className="w-full flex justify-between items-center p-4 frosted-glass rounded-lg hover:shadow-md transition-all duration-300"
                >
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-800">{service.title}</h3>
                    <div className="flex items-center mt-1 text-sm text-gray-600">
                      <Clock className="w-4 h-4 mr-1" />
                      <span>{service.duration}</span>
                      <span className="mx-2">•</span>
                      <span>{service.price} ₽</span>
                    </div>
                  </div>
                  <div className="ml-4 text-indigo-500">
                    <ArrowLeft className="w-5 h-5 transform rotate-180" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      case 2:
        return (
          <div className="animate-slide-in">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Выберите специалиста</h2>
            <div className="space-y-3">
              {specialists.map((specialist) => (
                <button
                  key={specialist.id}
                  onClick={() => handleSpecialistSelect(specialist.id)}
                  className="w-full flex items-center p-4 frosted-glass rounded-lg hover:shadow-md transition-all duration-300"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mr-4 overflow-hidden">
                    {specialist.photo ? (
                      <img src={specialist.photo} alt={specialist.name} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-6 h-6 text-indigo-500" />
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="font-medium text-gray-800">{specialist.name}</h3>
                    <Link to={`/specialists/${specialist.id}`} className="text-xs text-indigo-500">
                      Посмотреть профиль
                    </Link>
                  </div>
                  <div className="ml-4 text-indigo-500">
                    <ArrowLeft className="w-5 h-5 transform rotate-180" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      case 3:
        return (
          <div className="animate-slide-in">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Выберите дату</h2>
            <CalendarPicker />
          </div>
        );
      case 4:
        return (
          <div className="animate-slide-in">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">Выберите время</h2>
            <TimePicker />
          </div>
        );
      case 5:
        const selectedServiceObj = services.find(s => s.id === selectedService);
        const selectedSpecialistObj = specialists.find(s => s.id === selectedSpecialist);
        
        return (
          <div className="animate-slide-in">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-indigo-500" />
              </div>
              <h2 className="text-xl font-semibold mb-2 text-gray-800">Подтверждение записи</h2>
              <p className="text-gray-600">Проверьте данные и подтвердите запись</p>
            </div>
            
            <div className="frosted-glass rounded-lg p-5 mb-6">
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-gray-600 mb-1">Услуга:</div>
                  <div className="font-medium text-gray-800">{selectedServiceObj?.title}</div>
                </div>
                
                <div>
                  <div className="text-sm text-gray-600 mb-1">Специалист:</div>
                  <div className="font-medium text-gray-800">{selectedSpecialistObj?.name}</div>
                </div>
                
                <div className="flex">
                  <div className="w-1/2">
                    <div className="text-sm text-gray-600 mb-1">Дата:</div>
                    <div className="font-medium text-gray-800">
                      {selectedDate && format(selectedDate, 'PPP', { locale: ru })}
                    </div>
                  </div>
                  
                  <div className="w-1/2">
                    <div className="text-sm text-gray-600 mb-1">Время:</div>
                    <div className="font-medium text-gray-800">{selectedTime}</div>
                  </div>
                </div>
                
                <div>
                  <div className="text-sm text-gray-600 mb-1">Стоимость:</div>
                  <div className="font-medium text-gray-800">{selectedServiceObj?.price} ₽</div>
                </div>
              </div>
            </div>
            
            <AnimatedButton 
              fullWidth 
              onClick={handleBookingSubmit}
              className="mb-3"
            >
              Подтвердить запись
            </AnimatedButton>
            
            <button 
              onClick={() => setStep(1)}
              className="w-full text-center text-gray-600 py-2"
            >
              Начать заново
            </button>
          </div>
        );
      default:
        return null;
    }
  };
  
  // Render Progress Indicator
  const renderProgressIndicator = () => {
    return (
      <div className="flex justify-between items-center mb-6">
        {[1, 2, 3, 4, 5].map((s) => (
          <div 
            key={s} 
            className={`flex-1 h-1 rounded-full mx-1 ${s <= step ? 'bg-gradient-to-r from-indigo-500 to-purple-500' : 'bg-gray-200'}`}
          />
        ))}
      </div>
    );
  };

  return (
    <Layout>
      <div>
        {/* Back Button (not shown on first step) */}
        {step > 1 && (
          <button 
            onClick={() => setStep(step - 1)}
            className="inline-flex items-center text-gray-600 hover:text-gray-800 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            <span>Назад</span>
          </button>
        )}
        
        {/* Page Title */}
        <h1 className="text-2xl font-semibold mb-4 text-gray-800">Запись на прием</h1>
        
        {/* Progress Indicator */}
        {renderProgressIndicator()}
        
        {/* Step Content */}
        {renderStepContent()}
      </div>
    </Layout>
  );
};

export default Book;
