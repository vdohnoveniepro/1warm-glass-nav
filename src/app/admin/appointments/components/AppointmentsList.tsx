'use client';

import React from 'react';
import Image from 'next/image';
import { AppointmentStatus } from '@/models/types';
import { FaCalendarAlt, FaClock, FaUser, FaMapMarkerAlt, FaRubleSign, FaInfoCircle, FaEdit, FaTrash, FaEnvelope, FaPhone, FaArchive } from 'react-icons/fa';

// Типы для компонента
interface Appointment {
  id: string;
  specialistId: string;
  serviceId: string;
  userId?: string;
  date: string;
  startTime: string;
  endTime: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  price: number;
  status: AppointmentStatus;
  createdAt: string;
  updatedAt: string;
  service?: {
    name: string;
  };
  specialist?: {
    firstName: string;
    lastName: string;
    photo: string;
  };
  serviceName?: string;
}

interface Specialist {
  id: string;
  firstName: string;
  lastName: string;
  photo: string;
}

interface AppointmentsListProps {
  appointments: Appointment[];
  specialists: Specialist[];
  onAppointmentSelect: (appointment: Appointment) => void;
  onStatusChange: (appointmentId: string, newStatus: AppointmentStatus) => void;
  onDeleteAppointment?: (appointmentId: string) => void; // Опциональный обработчик удаления
}

// Компонент для отображения статуса записи
const AppointmentStatusBadge = ({ status }: { status: AppointmentStatus }) => {
  switch (status) {
    case AppointmentStatus.PENDING:
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        Ожидает подтверждения
      </span>;
    case AppointmentStatus.CONFIRMED:
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        Подтверждена
      </span>;
    case AppointmentStatus.COMPLETED:
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
        Завершена
      </span>;
    case AppointmentStatus.CANCELLED:
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
        Отменена
      </span>;
    case AppointmentStatus.ARCHIVED:
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
        <FaArchive className="mr-1 text-xs" /> В архиве
      </span>;
    default:
      return null;
  }
};

const AppointmentsList = ({
  appointments,
  specialists,
  onAppointmentSelect,
  onStatusChange,
  onDeleteAppointment,
}: AppointmentsListProps) => {
  // Форматирование даты
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  // Форматирование цены
  const formatPrice = (price: number) => {
    return price.toLocaleString('ru-RU') + ' ₽';
  };

  // Получение имени специалиста
  const getSpecialistName = (specialistId: string): string => {
    try {
      const specialist = specialists.find(s => s.id === specialistId);
      if (specialist) {
        return `${specialist.firstName} ${specialist.lastName}`;
      }
      
      // Если не нашли специалиста, проверяем, есть ли данные в самом объекте записи
      const appointment = appointments.find(a => a.specialistId === specialistId);
      if (appointment?.specialist?.firstName && appointment?.specialist?.lastName) {
        return `${appointment.specialist.firstName} ${appointment.specialist.lastName}`;
      }
      
      return 'Неизвестный специалист';
    } catch (error) {
      console.error('Ошибка при получении имени специалиста:', error);
      return 'Специалист';
    }
  };

  // Получение фото специалиста
  const getSpecialistPhoto = (specialistId: string): string => {
    try {
      const specialist = specialists.find(s => s.id === specialistId);
      if (specialist?.photo) {
        return specialist.photo;
      }
      
      // Если не нашли фото в списке специалистов, проверяем в самой записи
      const appointment = appointments.find(a => a.specialistId === specialistId);
      if (appointment?.specialist?.photo) {
        return appointment.specialist.photo;
      }
      
      return '';
    } catch (error) {
      console.error('Ошибка при получении фото специалиста:', error);
      return '';
    }
  };

  // Обработчик изменения статуса
  const handleStatusChange = (appointmentId: string, newStatus: AppointmentStatus) => {
    onStatusChange(appointmentId, newStatus);
  };

  return (
    <div className="space-y-4">
      {appointments.length === 0 ? (
        <div className="bg-white p-4 rounded-lg shadow-sm text-center text-gray-500">
          Нет записей, соответствующих выбранным параметрам
        </div>
      ) : (
        appointments.map((appointment) => (
          <div 
            key={appointment.id} 
            className="bg-white rounded-lg shadow-sm border overflow-hidden"
          >
            <div className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
                <div className="mb-4 sm:mb-0">
                  <div className="flex items-center">
                    <div className="mr-3 relative h-10 w-10 rounded-full overflow-hidden flex-shrink-0">
                      {getSpecialistPhoto(appointment.specialistId) ? (
                        <Image 
                          src={getSpecialistPhoto(appointment.specialistId)} 
                          alt={getSpecialistName(appointment.specialistId)}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500">
                          <FaUser />
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-800 mb-1">
                        {appointment.service?.name || (appointment.serviceName && typeof appointment.serviceName === 'string' ? appointment.serviceName : 'Неизвестная услуга')}
                      </h3>
                      <div className="text-sm text-gray-600">
                        {getSpecialistName(appointment.specialistId)}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:items-end">
                  <div className="mb-2">
                    <AppointmentStatusBadge status={appointment.status} />
                  </div>
                  <div className="text-lg font-bold text-[#48a9a6]">
                    {formatPrice(appointment.price)}
                  </div>
                </div>
              </div>
              
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center text-gray-700">
                  <FaCalendarAlt className="text-[#48a9a6] mr-2" />
                  <span>{formatDate(appointment.date)}</span>
                </div>
                <div className="flex items-center text-gray-700">
                  <FaClock className="text-[#48a9a6] mr-2" />
                  <span>{appointment.startTime} - {appointment.endTime}</span>
                </div>
                <div className="flex items-center text-gray-700">
                  <FaUser className="text-[#48a9a6] mr-2" />
                  <span>{appointment.firstName} {appointment.lastName}</span>
                </div>
                <div className="flex items-center text-gray-700">
                  <FaPhone className="text-[#48a9a6] mr-2" />
                  <span>{appointment.phone}</span>
                </div>
                <div className="flex items-center text-gray-700">
                  <FaEnvelope className="text-[#48a9a6] mr-2" />
                  <span className="truncate">{appointment.email}</span>
                </div>
                <div className="flex items-center text-gray-700">
                  <FaInfoCircle className="text-[#48a9a6] mr-2" />
                  <span>ID: {appointment.id.substring(0, 8)}...</span>
                </div>
              </div>
              
              <div className="mt-4 flex flex-wrap gap-2">
                {appointment.status === AppointmentStatus.PENDING && (
                  <>
                    <button
                      onClick={() => handleStatusChange(appointment.id, AppointmentStatus.CONFIRMED)}
                      className="px-3 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                    >
                      Подтвердить
                    </button>
                    <button
                      onClick={() => handleStatusChange(appointment.id, AppointmentStatus.CANCELLED)}
                      className="px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                    >
                      Отменить
                    </button>
                  </>
                )}
                
                {appointment.status === AppointmentStatus.CONFIRMED && (
                  <button
                    onClick={() => handleStatusChange(appointment.id, AppointmentStatus.COMPLETED)}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                  >
                    Завершить
                  </button>
                )}
                
                {/* Кнопка архивирования - показываем для всех записей, кроме архивных */}
                {appointment.status !== AppointmentStatus.ARCHIVED && (
                  <button
                    onClick={() => handleStatusChange(appointment.id, AppointmentStatus.ARCHIVED)}
                    className="px-3 py-1 bg-white text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center border border-gray-300"
                    title="Архивировать запись"
                  >
                    <FaArchive className="mr-1" /> Архивировать
                  </button>
                )}
                
                {/* Кнопка удаления - показываем только для архивных записей */}
                {appointment.status === AppointmentStatus.ARCHIVED && onDeleteAppointment && (
                  <button
                    onClick={() => onDeleteAppointment(appointment.id)}
                    className="px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors flex items-center"
                    title="Удалить запись"
                  >
                    <FaTrash className="mr-1" /> Удалить
                  </button>
                )}
                
                <button
                  onClick={() => onAppointmentSelect(appointment)}
                  className="px-3 py-1 bg-white text-gray-700 rounded-lg hover:bg-gray-200 transition-colors border border-gray-300"
                >
                  Подробнее
                </button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default AppointmentsList; 