'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FaPlus, FaSpinner, FaEdit, FaTrash, FaCheck, FaTimes, FaArrowLeft, FaGift } from 'react-icons/fa';
import { toast } from '@/components/ui/Toast';
import { Promo } from '@/types/promo';
import PromoModal from './components/PromoModal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

export default function PromosPage() {
  const router = useRouter();
  const [promos, setPromos] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPromo, setCurrentPromo] = useState<Promo | null>(null);
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // Загрузка промокодов
  const fetchPromos = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/promos');
      
      if (!response.ok) {
        throw new Error('Не удалось загрузить промокоды');
      }
      
      const data = await response.json();
      console.log('Полученные данные промокодов:', data.data);
      
      if (data.success) {
        // Преобразуем числовое значение is_active в булево значение isActive
        const processedPromos = data.data.map((promo: Promo) => {
          console.log(`Промокод ${promo.code}: is_active=${promo.is_active}, тип: ${typeof promo.is_active}`);
          // Явно проверяем, что is_active равно 0
          const isActiveValue = promo.is_active === 0 ? false : true;
          return {
            ...promo,
            isActive: isActiveValue
          };
        });
        console.log('Обработанные промокоды:', processedPromos);
        setPromos(processedPromos);
      } else {
        throw new Error(data.message || 'Ошибка загрузки промокодов');
      }
    } catch (error) {
      console.error('Ошибка при загрузке промокодов:', error);
      toast.error('Не удалось загрузить промокоды');
    } finally {
      setLoading(false);
    }
  };

  // Добавление нового промокода
  const handleAddPromo = () => {
    setCurrentPromo(null);
    setIsModalOpen(true);
  };

  // Редактирование промокода
  const handleEditPromo = (promo: Promo) => {
    setCurrentPromo(promo);
    setIsModalOpen(true);
  };

  // Сохранение промокода (создание или обновление)
  const handleSavePromo = async (promoData: any) => {
    try {
      const isEditing = !!currentPromo;
      const url = isEditing 
        ? `/api/admin/promos/${currentPromo.id}` 
        : '/api/admin/promos';
      
      const method = isEditing ? 'PUT' : 'POST';
      
      console.log('Отправляемые данные:', promoData);
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(promoData),
      });
      
      const data = await response.json();
      console.log('Ответ сервера:', data);
      
      if (data.success) {
        toast.success(isEditing ? 'Промокод обновлен' : 'Промокод создан');
        setIsModalOpen(false);
        fetchPromos();
      } else {
        toast.error(data.message || 'Ошибка при сохранении промокода');
      }
    } catch (error) {
      console.error('Ошибка при сохранении промокода:', error);
      toast.error('Произошла ошибка при сохранении промокода');
    }
  };

  // Удаление промокода
  const handleDeletePromo = (promo: Promo) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Удаление промокода',
      message: `Вы действительно хотите удалить промокод "${promo.code}"?`,
      onConfirm: () => confirmDeletePromo(promo.id)
    });
  };

  // Подтверждение удаления промокода
  const confirmDeletePromo = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/promos/${id}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Промокод успешно удален');
        setPromos(promos.filter(p => p.id !== id));
      } else {
        toast.error(data.message || 'Ошибка при удалении промокода');
      }
    } catch (error) {
      console.error('Ошибка при удалении промокода:', error);
      toast.error('Произошла ошибка при удалении промокода');
    } finally {
      setConfirmDialog(prev => ({ ...prev, isOpen: false }));
    }
  };

  // Изменение статуса активности промокода
  const handleToggleActive = async (promo: Promo) => {
    try {
      const newIsActive = !promo.isActive;
      
      const response = await fetch(`/api/admin/promos/${promo.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: newIsActive }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success(
          promo.isActive 
            ? 'Промокод деактивирован' 
            : 'Промокод активирован'
        );
        
        // Обновляем локальный список промокодов
        setPromos(prevPromos => 
          prevPromos.map(p => 
            p.id === promo.id 
              ? { ...p, isActive: newIsActive, is_active: newIsActive ? 1 : 0 } 
              : p
          )
        );
      } else {
        toast.error(data.message || 'Ошибка при изменении статуса промокода');
      }
    } catch (error) {
      console.error('Ошибка при изменении статуса промокода:', error);
      toast.error('Произошла ошибка при изменении статуса промокода');
    }
  };

  // Загрузка промокодов при монтировании компонента
  useEffect(() => {
    fetchPromos();
  }, []);

  // Форматирование даты
  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return 'Не указано';
    return new Date(date).toLocaleDateString('ru-RU');
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Управление промокодами</h1>
        <div className="flex space-x-2">
          <Link href="/admin/services/bonus" className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
            <FaGift />
            <span>Бонусная система</span>
          </Link>
          <button
            onClick={() => {
              setCurrentPromo(null);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-[#48a9a6] text-white rounded-md hover:bg-[#3d908d]"
          >
            <FaPlus />
            <span>Создать промокод</span>
          </button>
        </div>
      </div>
      
      <Link href="/admin/services" className="inline-block mb-6 text-[#48a9a6] hover:underline">
        <FaArrowLeft className="inline-block mr-2" />
        Вернуться к управлению услугами
      </Link>
      
      {/* Индикатор загрузки */}
      {loading && (
        <div className="flex justify-center items-center h-40">
          <div className="flex items-center justify-center space-x-2">
            <FaSpinner className="animate-spin text-blue-600 text-2xl" />
            <span className="text-gray-600">Загрузка промокодов...</span>
          </div>
        </div>
      )}
      
      {/* Пустое состояние */}
      {!loading && promos.length === 0 && (
        <div className="bg-gray-50 p-8 rounded-lg text-center">
          <h3 className="text-lg font-medium text-gray-700 mb-2">
            Нет промокодов
          </h3>
          <p className="text-gray-500 mb-4">
            Добавьте новый промокод, чтобы он отображался здесь
          </p>
          <button
            onClick={handleAddPromo}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <FaPlus />
            <span>Добавить промокод</span>
          </button>
        </div>
      )}
      
      {/* Таблица промокодов */}
      {!loading && promos.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded-lg overflow-hidden shadow">
            <thead className="bg-gray-100">
              <tr>
                <th className="py-3 px-4 text-left">Код</th>
                <th className="py-3 px-4 text-left">Описание</th>
                <th className="py-3 px-4 text-left">Скидка</th>
                <th className="py-3 px-4 text-left">Начало</th>
                <th className="py-3 px-4 text-left">Окончание</th>
                <th className="py-3 px-4 text-left">Использований</th>
                <th className="py-3 px-4 text-left">Статус</th>
                <th className="py-3 px-4 text-left">Действия</th>
              </tr>
            </thead>
            <tbody>
              {promos.map(promo => (
                <tr key={promo.id} className="border-t hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium">{promo.code}</td>
                  <td className="py-3 px-4">{promo.description}</td>
                  <td className="py-3 px-4">
                    {promo.discount_type === 'percentage' || promo.discountType === 'percentage'
                      ? `${promo.discount_value || promo.discountValue}%` 
                      : `${promo.discount_value || promo.discountValue} ₽`}
                  </td>
                  <td className="py-3 px-4">{formatDate(promo.start_date || promo.startDate)}</td>
                  <td className="py-3 px-4">{formatDate(promo.end_date || promo.endDate)}</td>
                  <td className="py-3 px-4">
                    {promo.currentUses ?? promo.current_uses} / {(promo.maxUses ?? promo.max_uses) || '∞'}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                      promo.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {promo.isActive ? 'Активен' : 'Неактивен'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleToggleActive(promo)}
                        className={`p-2 rounded-full ${
                          promo.isActive 
                            ? 'text-red-600 hover:bg-red-50' 
                            : 'text-green-600 hover:bg-green-50'
                        }`}
                        title={promo.isActive ? 'Деактивировать' : 'Активировать'}
                      >
                        {promo.isActive ? <FaTimes /> : <FaCheck />}
                      </button>
                      <button
                        onClick={() => handleEditPromo(promo)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-full"
                        title="Редактировать"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => handleDeletePromo(promo)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-full"
                        title="Удалить"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Модальное окно для создания/редактирования промокода */}
      {isModalOpen && (
        <PromoModal
          promo={currentPromo}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSavePromo}
        />
      )}
      
      {/* Диалог подтверждения */}
      {confirmDialog.isOpen && (
        <ConfirmDialog
          title={confirmDialog.title}
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        />
      )}
    </div>
  );
} 