'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { AppointmentStatus } from '@/models/types';
import { FaCalendarAlt, FaClock, FaUser, FaMapMarkerAlt, FaRubleSign, FaEnvelope, FaPhone, FaTimesCircle, FaStickyNote } from 'react-icons/fa';

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
  serviceName?: string;
  service?: {
    name: string;
  };
  specialist?: {
    firstName: string;
    lastName: string;
    photo: string;
  };
  notes?: string;
}

interface Specialist {
  id: string;
  firstName: string;
  lastName: string;
  photo: string;
}

interface AppointmentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  specialists: Specialist[];
  onStatusChange: (appointmentId: string, newStatus: AppointmentStatus) => void;
  onCreateNote?: (appointment: Appointment, closeModalFirst?: boolean) => void;
  hasNotes?: (appointmentId: string) => boolean;
}

// Статусы для выбора
const statuses = [
  { value: AppointmentStatus.PENDING, label: 'Ожидает подтверждения' },
  { value: AppointmentStatus.CONFIRMED, label: 'Подтверждена' },
  { value: AppointmentStatus.COMPLETED, label: 'Завершена' },
  { value: AppointmentStatus.CANCELLED, label: 'Отменена' },
];

const AppointmentDetailsModal = ({
  isOpen,
  onClose,
  appointment,
  specialists,
  onStatusChange,
  onCreateNote,
  hasNotes,
}: AppointmentDetailsModalProps) => {
  // Логирование входных параметров для отладки
  console.log('[AppointmentDetailsModal] Props:', {
    isOpen,
    appointmentId: appointment?.id,
    specialistsCount: specialists?.length,
    hasCreateNoteFunction: !!onCreateNote,
    hasNotesFunction: !!hasNotes
  });

  // Состояние для анимации
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Обрабатываем открытие и закрытие модального окна с анимацией
  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      
      // Добавляем дополнительную проверку hasNotes при открытии модального окна
      if (appointment && hasNotes) {
        console.log(`[AppointmentDetailsModal] При открытии: проверка hasNotes для записи ${appointment.id}:`, hasNotes(appointment.id));
      }
    } else {
      setIsAnimating(false);
    }
  }, [isOpen, appointment]);

  // Также проверяем hasNotes при изменении appointment
  useEffect(() => {
    if (isOpen && appointment && hasNotes) {
      console.log(`[AppointmentDetailsModal] При изменении appointment: проверка hasNotes для записи ${appointment.id}:`, hasNotes(appointment.id));
    }
  }, [appointment, hasNotes, isOpen]);
  
  // Если модальное окно закрыто или нет данных записи
  if (!isOpen || !appointment) {
    return null;
  }
  
  // Логируем детали записи для отладки
  console.log('[AppointmentDetailsModal] Данные записи:', appointment);
  
  // Проверяем и преобразуем данные записи, если необходимо
  const prepareAppointmentData = () => {
    const emptyString = '';
    
    // Проверяем поля, связанные с клиентом
    if (!appointment.firstName && !appointment.lastName && appointment.userId) {
      console.log('[AppointmentDetailsModal] Данные о клиенте отсутствуют, но есть userId:', appointment.userId);
    }
    
    console.log('[AppointmentDetailsModal] Проверка полей записи:', {
      hasFirstName: !!appointment.firstName,
      hasLastName: !!appointment.lastName,
      hasEmail: !!appointment.email,
      hasPhone: !!appointment.phone,
      hasNotes: !!appointment.notes
    });
    
    // Пытаемся извлечь информацию о клиенте из notes, если основные поля не заполнены
    let extractedFirstName = appointment.firstName || '';
    let extractedLastName = appointment.lastName || '';
    let extractedEmail = appointment.email || '';
    let extractedPhone = appointment.phone || '';
    
    if (appointment.notes && (!appointment.firstName || !appointment.email || !appointment.phone)) {
      try {
        const notesData = JSON.parse(appointment.notes);
        console.log('[AppointmentDetailsModal] Разобраны данные из notes:', notesData);
        
        // Извлекаем имя и фамилию, если они есть в notes
        if (notesData.name && !extractedFirstName) {
          const nameParts = notesData.name.split(' ');
          extractedFirstName = nameParts[0] || '';
          extractedLastName = nameParts[1] || '';
          console.log('[AppointmentDetailsModal] Извлечено имя из notes:', extractedFirstName, extractedLastName);
        }
        
        // Извлекаем email, если он есть в notes
        if (notesData.email && !extractedEmail) {
          extractedEmail = notesData.email;
          console.log('[AppointmentDetailsModal] Извлечен email из notes:', extractedEmail);
        }
        
        // Извлекаем телефон, если он есть в notes
        if (notesData.phone && !extractedPhone) {
          extractedPhone = notesData.phone;
          console.log('[AppointmentDetailsModal] Извлечен телефон из notes:', extractedPhone);
        }
      } catch (e) {
        console.error('[AppointmentDetailsModal] Ошибка при разборе notes:', e);
      }
    }
    
    // Возвращаем объект с гарантированными полями (даже если они пустые)
    return {
      ...appointment,
      firstName: extractedFirstName || emptyString,
      lastName: extractedLastName || emptyString,
      email: extractedEmail || emptyString,
      phone: extractedPhone || emptyString
    };
  };
  
  // Получение имени специалиста
  const getSpecialistName = (specialistId: string): string => {
    const specialist = specialists.find(s => s.id === specialistId);
    if (specialist) {
      return `${specialist.firstName} ${specialist.lastName}`;
    }
    return 'Специалист';
  };

  // Получение фото специалиста
  const getSpecialistPhoto = (specialistId: string): string => {
    const specialist = specialists.find(s => s.id === specialistId);
    return specialist?.photo || '';
  };

  // Обработчик изменения статуса
  const handleStatusChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = event.target.value as AppointmentStatus;
    onStatusChange(appointment.id, newStatus);
  };

  // Обработчик для закрытия с анимацией
  const handleClose = () => {
    setIsAnimating(false);
    // Задержка для анимации
    setTimeout(() => {
      onClose();
    }, 300);
  };

  // Подготовленные данные для отображения
  const appointmentData = prepareAppointmentData();

  // Форматирование даты
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  // Форматирование даты и времени
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU');
  };

  // Форматирование цены
  const formatPrice = (price: number) => {
    return price.toLocaleString('ru-RU') + ' ₽';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 transition-opacity duration-300 ease-in-out"
         onClick={handleClose}>
      <div 
        className={`bg-white rounded-t-2xl sm:rounded-lg shadow-lg w-full sm:max-w-3xl max-h-[80vh] overflow-y-auto transform transition-transform duration-300 ease-out ${isAnimating ? 'translate-y-0' : 'translate-y-full sm:translate-y-24 sm:opacity-0'}`}
        onClick={(e) => e.stopPropagation()}>
        {/* Полоска для перетаскивания в мобильной версии */}
        <div className="h-1.5 w-16 bg-gray-300 rounded-full mx-auto my-2 sm:hidden"></div>
        
        <div className="flex justify-between items-center p-2 sm:p-4 border-b">
          <h2 className="text-lg sm:text-xl font-semibold">Информация о записи</h2>
          <button 
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 focus:outline-none p-1"
          >
            <FaTimesCircle size={20} />
          </button>
        </div>
        
        {/* Информационное уведомление о наличии заметок - с дополнительной отладочной информацией */}
        {(() => {
          if (appointment) {
            console.log(`[AppointmentDetailsModal] Проверка заметок для записи ${appointment.id}:`, 
              hasNotes ? `hasNotes=${hasNotes(appointment.id)}` : 'функция hasNotes не передана');
          }
          
          // Проверка на наличие заметок
          if (hasNotes && appointment && hasNotes(appointment.id)) {
            console.log(`[AppointmentDetailsModal] У записи ${appointment.id} есть заметка, отображаем блок информации`);
            return (
              <div className="mx-3 sm:mx-6 mt-3 sm:mt-4 p-2 sm:p-3 bg-amber-50 border border-amber-100 rounded-lg flex justify-between items-center">
                <div className="flex items-center text-amber-700">
                  <FaStickyNote className="mr-2 text-amber-500" />
                  <span className="text-sm">Для этой записи есть заметка</span>
                </div>
                <button
                  onClick={() => {
                    handleClose(); // Закрываем текущее окно
                    setTimeout(() => {
                      if (onCreateNote) onCreateNote(appointmentData, true);
                    }, 300); // Даем время для закрытия анимации
                  }}
                  className="px-2 py-1 text-xs bg-amber-100 text-amber-700 rounded hover:bg-amber-200 transition-colors"
                >
                  Открыть заметку
                </button>
              </div>
            );
          }
          
          return null;
        })()}
        
        <div className="p-3 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
            <div>
              <div className="mb-3 sm:mb-6">
                <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3">Детали записи</h3>
                <div className="grid grid-cols-1 gap-2 sm:gap-3">
                  <div className="flex items-center">
                    <FaCalendarAlt className="text-[#48a9a6] mr-2 sm:mr-3 text-sm sm:text-base" />
                    <div>
                      <div className="text-xs sm:text-sm text-gray-500">Дата</div>
                      <div className="text-sm sm:text-base">{formatDate(appointmentData.date)}</div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <FaClock className="text-[#48a9a6] mr-2 sm:mr-3 text-sm sm:text-base" />
                    <div>
                      <div className="text-xs sm:text-sm text-gray-500">Время</div>
                      <div className="text-sm sm:text-base">{appointmentData.startTime} - {appointmentData.endTime}</div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <FaRubleSign className="text-[#48a9a6] mr-2 sm:mr-3 text-sm sm:text-base" />
                    <div>
                      <div className="text-xs sm:text-sm text-gray-500">Стоимость</div>
                      <div className="text-sm sm:text-base">{formatPrice(appointmentData.price)}</div>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <FaUser className="text-[#48a9a6] mr-2 sm:mr-3 text-sm sm:text-base" />
                    <div>
                      <div className="text-xs sm:text-sm text-gray-500">Услуга</div>
                      <div className="text-sm sm:text-base truncate max-w-[180px] sm:max-w-full">{appointmentData.service?.name || appointmentData.serviceName || 'Неизвестная услуга'}</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3">Данные о специалисте</h3>
                <div className="flex items-center mb-3 sm:mb-4">
                  <div className="mr-2 sm:mr-3 relative h-12 w-12 sm:h-16 sm:w-16 rounded-full overflow-hidden flex-shrink-0">
                    {getSpecialistPhoto(appointmentData.specialistId) ? (
                      <Image 
                        src={getSpecialistPhoto(appointmentData.specialistId)} 
                        alt={getSpecialistName(appointmentData.specialistId)}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-500">
                        <FaUser size={20} />
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-sm sm:text-base">{getSpecialistName(appointmentData.specialistId)}</div>
                    <div className="text-xs sm:text-sm text-gray-500">ID: {appointmentData.specialistId}</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <div className="mb-3 sm:mb-6">
                <div className="bg-white rounded-lg p-2 sm:p-4 shadow-sm mt-2 sm:mt-4">
                  <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3">Информация о клиенте</h3>
                  <div className="grid grid-cols-1 gap-1 sm:gap-2">
                    <div>
                      <span className="text-xs sm:text-sm text-gray-500">Имя и фамилия</span>
                      <p className="font-medium text-sm sm:text-base">
                        {appointmentData.firstName ? 
                          `${appointmentData.firstName} ${appointmentData.lastName || ''}` : 
                          'Нет данных'}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs sm:text-sm text-gray-500">Телефон</span>
                      <p className="font-medium text-sm sm:text-base">
                        {appointmentData.phone || 'Нет данных'}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs sm:text-sm text-gray-500">Email</span>
                      <p className="font-medium text-sm sm:text-base">
                        {appointmentData.email || 'Нет данных'}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs sm:text-sm text-gray-500">ID пользователя</span>
                      <p className="font-medium text-sm sm:text-base break-all">
                        {appointmentData.userId || 'Не зарегистрирован'}
                      </p>
                    </div>
                    {/* Добавляем проверку на наличие дополнительных данных клиента */}
                    {appointmentData.notes && (
                      <div>
                        <span className="text-xs sm:text-sm text-gray-500">Дополнительная информация</span>
                        <p className="font-medium text-xs sm:text-sm whitespace-pre-wrap max-h-20 overflow-y-auto">
                          {(() => {
                            try {
                              const notesData = JSON.parse(appointmentData.notes);
                              if (notesData.additionalNotes) {
                                return notesData.additionalNotes;
                              }
                              return null;
                            } catch (e) {
                              return typeof appointmentData.notes === 'string' 
                                ? appointmentData.notes 
                                : 'Нет данных';
                            }
                          })()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3">Управление статусом</h3>
                <div className="mb-3 sm:mb-4">
                  <label htmlFor="status" className="block text-xs sm:text-sm text-gray-500 mb-1">Статус записи</label>
                  <select
                    id="status"
                    value={appointmentData.status}
                    onChange={handleStatusChange}
                    className="w-full p-1.5 sm:p-2 border rounded-md text-sm sm:text-base"
                  >
                    {statuses.map(status => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div>
                    <div className="text-xs sm:text-sm text-gray-500 mb-1">Создана</div>
                    <div className="text-xs sm:text-sm">{formatDateTime(appointmentData.createdAt)}</div>
                  </div>
                  <div>
                    <div className="text-xs sm:text-sm text-gray-500 mb-1">Обновлена</div>
                    <div className="text-xs sm:text-sm">{formatDateTime(appointmentData.updatedAt)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-3 sm:mt-6 pt-2 sm:pt-4 border-t flex flex-wrap justify-end gap-2 pb-6 sm:pb-0">
            {/* Добавляем кнопку для создания заметки */}
            {onCreateNote && (
              <button
                onClick={() => {
                  console.log('[AppointmentDetailsModal] Создаем/редактируем заметку для записи:', appointmentData.id);
                  handleClose(); // Закрываем текущее окно
                  setTimeout(() => {
                    onCreateNote(appointmentData, true);
                  }, 300); // Даем время для закрытия анимации
                }}
                className="px-2 sm:px-4 py-1 sm:py-2 text-sm bg-amber-100 text-amber-700 rounded-md hover:bg-amber-200 transition-colors flex items-center"
              >
                <FaStickyNote className="mr-1" /> 
                Заметка
              </button>
            )}
            
            <button
              onClick={handleClose}
              className="px-2 sm:px-4 py-1 sm:py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            >
              Закрыть
            </button>
            
            {appointmentData.status === AppointmentStatus.PENDING && (
              <button
                onClick={() => onStatusChange(appointmentData.id, AppointmentStatus.CONFIRMED)}
                className="px-2 sm:px-4 py-1 sm:py-2 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
              >
                Подтвердить
              </button>
            )}
            
            {appointmentData.status === AppointmentStatus.CONFIRMED && (
              <button
                onClick={() => onStatusChange(appointmentData.id, AppointmentStatus.COMPLETED)}
                className="px-2 sm:px-4 py-1 sm:py-2 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
              >
                Завершить
              </button>
            )}
            
            {appointmentData.status !== AppointmentStatus.CANCELLED && (
              <button
                onClick={() => onStatusChange(appointmentData.id, AppointmentStatus.CANCELLED)}
                className="px-2 sm:px-4 py-1 sm:py-2 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
              >
                Отменить
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppointmentDetailsModal; 