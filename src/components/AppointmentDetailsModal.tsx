import React, { useState, useEffect } from 'react';
import { AppointmentWithDetails, Specialist } from '@/models/types';
import { FaUser, FaStickyNote } from 'react-icons/fa';
import NotesModal from '@/app/(cabinet)/cabinet/calendar/components/NotesModal';

interface AppointmentDetailsModalProps {
  appointment: AppointmentWithDetails;
  specialists: Specialist[];
  isOpen: boolean;
  onClose: () => void;
  onStatusChange: (appointmentId: string, newStatus: string) => void;
  hasNotes?: boolean;
}

const AppointmentDetailsModal: React.FC<AppointmentDetailsModalProps> = ({
  appointment,
  specialists,
  isOpen,
  onClose,
  onStatusChange,
  hasNotes = false
}) => {
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [appointmentHasNotes, setAppointmentHasNotes] = useState(hasNotes);
  
  // Проверяем наличие заметок при открытии модального окна
  useEffect(() => {
    // Обновляем состояние при изменении входного параметра
    setAppointmentHasNotes(hasNotes);
    
    // Если модальное окно открыто, проверяем наличие заметок для этой записи
    if (isOpen && appointment?.id && appointment?.specialistId) {
      const checkForNotes = async () => {
        try {
          const response = await fetch(`/api/admin/appointments/notes?specialistId=${appointment.specialistId}`);
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data) {
              // Проверяем, есть ли заметка для этой записи
              if (data.data[appointment.id]) {
                setAppointmentHasNotes(true);
              }
            }
          }
        } catch (error) {
          console.error('Ошибка при проверке наличия заметок:', error);
        }
      };
      
      checkForNotes();
    }
  }, [isOpen, appointment, hasNotes]);
  
  if (!isOpen) return null;

  // Получаем информацию о специалисте
  const specialist = specialists.find(s => s.id === appointment.specialistId) || appointment.specialist;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Детали записи</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        {/* Информация о специалисте */}
        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <h3 className="text-lg font-semibold mb-2">Информация о специалисте</h3>
          <div className="flex items-center space-x-4">
            {specialist?.photo ? (
              <img 
                src={specialist.photo} 
                alt={`${specialist.firstName} ${specialist.lastName}`}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                <FaUser className="text-gray-400 text-2xl" />
              </div>
            )}
            <div>
              <p className="font-medium">
                {specialist?.firstName} {specialist?.lastName}
              </p>
              <p className="text-sm text-gray-500">ID: {appointment.specialistId}</p>
            </div>
          </div>
        </div>

        {/* Остальная информация о записи */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold mb-2">Информация о клиенте</h3>
            <p><span className="font-medium">Имя:</span> {appointment.firstName} {appointment.lastName}</p>
            <p><span className="font-medium">Телефон:</span> {appointment.phone}</p>
            <p><span className="font-medium">Email:</span> {appointment.email}</p>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Детали записи</h3>
            <p><span className="font-medium">Дата и время:</span> {new Date(appointment.date).toLocaleString()}</p>
            <p><span className="font-medium">Услуга:</span> {appointment.serviceName}</p>
            <p><span className="font-medium">Статус:</span> {appointment.status}</p>
            <p><span className="font-medium">Комментарий:</span> {appointment.notes || 'Нет комментария'}</p>
          </div>
        </div>

        {/* Кнопки управления */}
        <div className="mt-6 flex justify-end space-x-4">
          <button
            onClick={() => setIsNotesModalOpen(true)}
            className="px-4 py-2 bg-orange-100 text-orange-700 rounded hover:bg-orange-200 flex items-center"
          >
            <FaStickyNote className="mr-2" /> 
            Заметки
            {appointmentHasNotes && (
              <span className="ml-2 flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
            )}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            Закрыть
          </button>
          <button
            onClick={() => onStatusChange(appointment.id, 'completed')}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Завершить
          </button>
        </div>
      </div>
      
      {/* Модальное окно для заметок */}
      <NotesModal
        isOpen={isNotesModalOpen}
        onClose={() => {
          setIsNotesModalOpen(false);
          // Обновляем индикатор наличия заметок после закрытия модального окна
          if (appointment?.id && appointment?.specialistId) {
            const checkForNotes = async () => {
              try {
                const response = await fetch(`/api/admin/appointments/notes?specialistId=${appointment.specialistId}`);
                if (response.ok) {
                  const data = await response.json();
                  if (data.success && data.data) {
                    setAppointmentHasNotes(!!data.data[appointment.id]);
                  }
                }
              } catch (error) {
                console.error('Ошибка при проверке наличия заметок:', error);
              }
            };
            
            checkForNotes();
          }
        }}
        specialistId={appointment.specialistId}
        initialClientName={`${appointment.firstName} ${appointment.lastName}`}
        initialServiceName={appointment.serviceName}
        initialServiceId={appointment.serviceId}
        appointmentId={appointment.id}
        openExistingNote={true}
      />
    </div>
  );
};

export default AppointmentDetailsModal; 