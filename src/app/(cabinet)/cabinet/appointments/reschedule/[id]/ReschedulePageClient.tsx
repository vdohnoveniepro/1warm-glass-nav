'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { toast } from '@/components/ui/Toast';
import { FaCalendarAlt, FaClock, FaArrowLeft, FaUserCheck } from 'react-icons/fa';
import Link from 'next/link';
import Image from 'next/image';
import LoadingSpinner from '@/components/LoadingSpinner';
import FixedDatePicker from '@/components/FixedDatePicker';
import { TimeSlot } from '@/models/types';

interface AppointmentDetails {
  id: string;
  specialistId: string;
  serviceId: string;
  date: string;
  startTime: string;
  endTime: string;
  price: number;
  status: string;
  specialist: {
    firstName: string;
    lastName: string;
    photo: string;
  };
  service: {
    name: string;
    duration: number;
  };
}

// Функция для форматирования даты
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
};

interface ReschedulePageClientProps {
  appointmentId: string;
}

export default function ReschedulePageClient({ appointmentId }: ReschedulePageClientProps) {
  const { user, isLoading: userLoading } = useAuth();
  const router = useRouter();
  const [appointment, setAppointment] = useState<AppointmentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{ start: string, end: string } | null>(null);
  const [availableSlots, setAvailableSlots] = useState<{ start: string, end: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Загрузка данных о записи
  useEffect(() => {
    const fetchAppointment = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/appointments/${appointmentId}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('Ошибка при загрузке данных записи:', errorData);
          toast.error('Ошибка загрузки данных о записи');
          router.push('/cabinet/appointments');
          return;
        }
        
        const data = await response.json();
        console.log('Данные о записи:', data);
        
        if (!data.success) {
          toast.error(data.error || 'Ошибка загрузки данных о записи');
          router.push('/cabinet/appointments');
          return;
        }
        
        setAppointment(data.data);
      } catch (error) {
        console.error('Error fetching appointment:', error);
        toast.error('Ошибка загрузки данных о записи');
        router.push('/cabinet/appointments');
      } finally {
        setLoading(false);
      }
    };

    if (!userLoading && user) {
      fetchAppointment();
    } else if (!userLoading && !user) {
      router.push('/login');
    }
  }, [appointmentId, router, user, userLoading]);

  // Загрузка доступных слотов при выборе даты
  useEffect(() => {
    const fetchTimeSlots = async () => {
      if (!selectedDate || !appointment) return;
      
      try {
        console.log(`[ReschedulePageClient] Получение доступных слотов на дату ${selectedDate}`);
        setAvailableSlots([]);
        
        const response = await fetch(`/api/specialists/${appointment.specialistId}/availability?date=${selectedDate}&serviceId=${appointment.serviceId}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('Ошибка при загрузке доступных слотов:', errorData);
          toast.error('Ошибка загрузки доступных слотов');
          return;
        }
        
        const data = await response.json();
        
        if (!data.success) {
          toast.error(data.error || 'Ошибка загрузки доступных слотов');
          return;
        }
        
        // Фильтруем только доступные слоты
        const availableTimeSlots = data.data.slots
          .filter((slot: any) => slot.isAvailable)
          .map((slot: any) => ({
            start: slot.start,
            end: slot.end
          }));
        
        console.log(`[ReschedulePageClient] Получено ${availableTimeSlots.length} доступных слотов`);
        setAvailableSlots(availableTimeSlots);
      } catch (error) {
        console.error('Ошибка при загрузке доступных слотов:', error);
        toast.error('Ошибка загрузки доступных слотов');
      }
    };

    if (selectedDate) {
      fetchTimeSlots();
    }
  }, [selectedDate, appointment]);

  // Обработка подтверждения переноса записи
  const handleReschedule = async () => {
    if (!appointment || !selectedDate || !selectedTimeSlot) {
      toast.error('Выберите новую дату и время');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/appointments/${appointment.id}/reschedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: selectedDate,
          startTime: selectedTimeSlot.start,
          endTime: selectedTimeSlot.end
        }),
      });

      const data = await response.json();

      if (!data.success) {
        toast.error(data.message || 'Ошибка при переносе записи');
        return;
      }

      toast.success('Запись успешно перенесена');
      router.push('/cabinet/appointments');
    } catch (error) {
      console.error('Error rescheduling appointment:', error);
      toast.error('Ошибка при переносе записи');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (userLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <LoadingSpinner />
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="text-center py-10">
        <h1 className="text-xl font-semibold mb-4">Запись не найдена</h1>
        <Link href="/cabinet/appointments" className="text-[#48a9a6] hover:underline">
          Вернуться к списку записей
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/cabinet/appointments" className="flex items-center text-[#48a9a6] hover:underline">
          <FaArrowLeft className="mr-2" />
          Вернуться к списку записей
        </Link>
      </div>
      
      <h1 className="text-2xl font-bold mb-6">Перенос записи</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-lg font-semibold border-b pb-2 mb-4">Текущая запись</h2>
        <div className="flex flex-wrap md:flex-nowrap gap-4 items-start">
          <div className="w-full md:w-1/2">
            <div className="flex items-center mb-4">
              <div className="relative h-12 w-12 rounded-full overflow-hidden flex-shrink-0 mr-3 border border-gray-200">
                {appointment.specialist.photo ? (
                  <Image 
                    src={appointment.specialist.photo} 
                    alt={`${appointment.specialist.firstName} ${appointment.specialist.lastName}`}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100">
                    <FaUserCheck className="text-gray-500" />
                  </div>
                )}
              </div>
              <div>
                <div className="font-medium">
                  {appointment.specialist.firstName} {appointment.specialist.lastName}
                </div>
                <div className="text-sm text-gray-600">
                  {appointment.service.name}
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-y-2 text-sm mb-4">
              <div className="flex items-center text-gray-700">
                <FaCalendarAlt className="text-[#48a9a6] mr-2" />
                <span>{formatDate(appointment.date)}</span>
              </div>
              <div className="flex items-center text-gray-700">
                <FaClock className="text-[#48a9a6] mr-2" />
                <span>{appointment.startTime} - {appointment.endTime}</span>
              </div>
            </div>
          </div>
          
          <div className="w-full md:w-1/2 bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium mb-2">Выберите новую дату и время</h3>
            <div className="mb-4">
              <FixedDatePicker 
                specialistId={appointment.specialistId}
                serviceId={appointment.serviceId}
                onSelectDate={setSelectedDate}
                selectedDate={selectedDate}
                timeSlots={availableSlots.map(slot => ({
                  start: slot.start,
                  end: slot.end,
                  isAvailable: true
                }))}
                onSelectTime={(timeSlot) => setSelectedTimeSlot({
                  start: timeSlot.start,
                  end: timeSlot.end
                })}
                selectedTime={selectedTimeSlot ? {
                  start: selectedTimeSlot.start,
                  end: selectedTimeSlot.end,
                  isAvailable: true
                } : null}
                isLoading={loading}
                loadingMessage="Загрузка доступных дат..."
                noTimeSlotsMessage="Нет доступного времени на выбранную дату"
              />
            </div>
            
            {selectedDate && selectedTimeSlot && (
              <div className="bg-[#48a9a6]/10 p-3 rounded-lg">
                <h4 className="text-sm font-medium mb-2">Выбранное время</h4>
                <div className="flex items-center gap-2 text-gray-800">
                  <span className="font-medium">{formatDate(selectedDate)}</span>
                  <span>&middot;</span>
                  <span>{selectedTimeSlot.start} - {selectedTimeSlot.end}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex justify-end gap-4">
        <Link 
          href="/cabinet/appointments"
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
        >
          Отмена
        </Link>
        <button
          onClick={handleReschedule}
          disabled={!selectedDate || !selectedTimeSlot || isSubmitting}
          className="px-4 py-2 bg-[#48a9a6] text-white rounded-lg hover:bg-[#3a8a87] disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          {isSubmitting && <LoadingSpinner size="sm" className="mr-2" />}
          Подтвердить перенос
        </button>
      </div>
    </div>
  );
} 