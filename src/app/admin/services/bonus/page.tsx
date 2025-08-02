'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { FaArrowLeft, FaSpinner, FaSave, FaUsers, FaHistory, FaUserPlus } from 'react-icons/fa';
import { toast } from '@/components/ui/Toast';

interface BonusSettings {
  id: string;
  bookingBonusAmount: number;
  referrerBonusAmount: number;
  referralBonusAmount: number;
  updatedAt: string;
}

interface BonusTransaction {
  id: string;
  userId: string;
  amount: number;
  type: 'booking' | 'referral' | 'manual' | 'spent';
  status: 'pending' | 'completed' | 'cancelled';
  description?: string;
  appointmentId?: string;
  referredUserId?: string;
  createdAt: string;
  updatedAt: string;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  bonusBalance: number;
  createdAt: string;
}

export default function BonusSystemPage() {
  const [settings, setSettings] = useState<BonusSettings | null>(null);
  const [transactions, setTransactions] = useState<BonusTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'settings' | 'transactions' | 'referrals' | 'users'>('settings');
  
  // Добавляем состояния для управления пользователями
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userTransactions, setUserTransactions] = useState<BonusTransaction[]>([]);
  const [loadingUserData, setLoadingUserData] = useState(false);
  const [bonusAmount, setBonusAmount] = useState('');
  const [bonusDescription, setBonusDescription] = useState('');
  const [operation, setOperation] = useState<'add' | 'subtract'>('add');
  const [processingBonus, setProcessingBonus] = useState(false);
  const [totalUsers, setTotalUsers] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(10);

  // Загрузка настроек бонусной системы
  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/bonus/settings');
      
      if (!response.ok) {
        throw new Error('Не удалось загрузить настройки бонусной системы');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setSettings(data.settings);
      } else {
        throw new Error(data.message || 'Ошибка загрузки настроек бонусной системы');
      }
    } catch (error) {
      console.error('Ошибка при загрузке настроек бонусной системы:', error);
      toast.error('Не удалось загрузить настройки бонусной системы');
    } finally {
      setLoading(false);
    }
  };

  // Загрузка транзакций бонусной системы
  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/bonus/transactions');
      
      if (!response.ok) {
        throw new Error('Не удалось загрузить транзакции бонусной системы');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setTransactions(data.transactions);
      } else {
        throw new Error(data.message || 'Ошибка загрузки транзакций бонусной системы');
      }
    } catch (error) {
      console.error('Ошибка при загрузке транзакций бонусной системы:', error);
      toast.error('Не удалось загрузить транзакции бонусной системы');
    } finally {
      setLoading(false);
    }
  };

  // Автоматическая инициализация бонусной системы
  const initializeBonusSystem = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/database/initialize-bonus', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log('Бонусная система успешно инициализирована');
        // Обновляем данные после инициализации
        fetchSettings();
        fetchTransactions();
      } else {
        console.error('Ошибка при инициализации бонусной системы:', data.message);
      }
    } catch (error) {
      console.error('Ошибка при инициализации бонусной системы:', error);
    } finally {
      setLoading(false);
    }
  };

  // Обновление статуса транзакции
  const updateTransactionStatus = async (id: string, status: 'pending' | 'completed' | 'cancelled') => {
    try {
      const response = await fetch(`/api/bonus/transactions/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Статус транзакции успешно обновлен');
        // Обновляем список транзакций
        fetchTransactions();
      } else {
        throw new Error(data.message || 'Ошибка при обновлении статуса транзакции');
      }
    } catch (error) {
      console.error('Ошибка при обновлении статуса транзакции:', error);
      toast.error('Не удалось обновить статус транзакции');
    }
  };

  // Сохранение настроек бонусной системы
  const saveSettings = async () => {
    if (!settings) return;

    try {
      setSaving(true);
      const response = await fetch('/api/bonus/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingBonusAmount: settings.bookingBonusAmount,
          referrerBonusAmount: settings.referrerBonusAmount,
          referralBonusAmount: settings.referralBonusAmount,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Настройки бонусной системы успешно сохранены');
        setSettings(data.settings);
      } else {
        throw new Error(data.message || 'Ошибка при сохранении настроек бонусной системы');
      }
    } catch (error) {
      console.error('Ошибка при сохранении настроек бонусной системы:', error);
      toast.error('Не удалось сохранить настройки бонусной системы');
    } finally {
      setSaving(false);
    }
  };

  // Загрузка пользователей с информацией о бонусах
  const fetchUsers = async (page = 1, search = '') => {
    try {
      setLoading(true);
      const offset = (page - 1) * usersPerPage;
      const response = await fetch(`/api/admin/users/bonus?search=${encodeURIComponent(search)}&limit=${usersPerPage}&offset=${offset}`);
      
      if (!response.ok) {
        throw new Error('Не удалось загрузить список пользователей');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setUsers(data.data.users);
        setTotalUsers(data.data.pagination.total);
        setCurrentPage(page);
      } else {
        throw new Error(data.message || 'Ошибка загрузки списка пользователей');
      }
    } catch (error) {
      console.error('Ошибка при загрузке списка пользователей:', error);
      toast.error('Не удалось загрузить список пользователей');
    } finally {
      setLoading(false);
    }
  };
  
  // Загрузка информации о бонусах конкретного пользователя
  const fetchUserBonusData = async (userId: string) => {
    try {
      setLoadingUserData(true);
      const response = await fetch(`/api/admin/users/${userId}/bonus`);
      
      if (!response.ok) {
        throw new Error('Не удалось загрузить информацию о бонусах пользователя');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setSelectedUser(data.data.user);
        setUserTransactions(data.data.transactions);
      } else {
        throw new Error(data.message || 'Ошибка загрузки информации о бонусах пользователя');
      }
    } catch (error) {
      console.error('Ошибка при загрузке информации о бонусах пользователя:', error);
      toast.error('Не удалось загрузить информацию о бонусах пользователя');
    } finally {
      setLoadingUserData(false);
    }
  };
  
  // Обработка операции с бонусами пользователя
  const handleBonusOperation = async () => {
    if (!selectedUser || !bonusAmount || isNaN(Number(bonusAmount)) || Number(bonusAmount) <= 0) {
      toast.error('Укажите корректную сумму бонусов');
      return;
    }
    
    try {
      setProcessingBonus(true);
      
      const response = await fetch(`/api/admin/users/${selectedUser.id}/bonus`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: Number(bonusAmount),
          description: bonusDescription || undefined,
          operation
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success(data.message || `Бонусы успешно ${operation === 'add' ? 'начислены' : 'списаны'}`);
        // Обновляем данные пользователя
        fetchUserBonusData(selectedUser.id);
        // Сбрасываем форму
        setBonusAmount('');
        setBonusDescription('');
      } else {
        throw new Error(data.message || 'Ошибка при операции с бонусами');
      }
    } catch (error) {
      console.error('Ошибка при операции с бонусами:', error);
      toast.error(error instanceof Error ? error.message : 'Не удалось выполнить операцию с бонусами');
    } finally {
      setProcessingBonus(false);
    }
  };
  
  // Обработчик поиска пользователей
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers(1, searchQuery);
  };
  
  // Обработчик выбора пользователя
  const handleSelectUser = (user: User) => {
    setSelectedUser(user);
    fetchUserBonusData(user.id);
  };
  
  // Обработчик перехода на страницу
  const handlePageChange = (page: number) => {
    fetchUsers(page, searchQuery);
  };

  // Загрузка данных при монтировании компонента и переключении вкладок
  useEffect(() => {
    // Сначала инициализируем бонусную систему
    initializeBonusSystem();
    // Затем загружаем данные в зависимости от активной вкладки
    if (activeTab === 'settings') {
      fetchSettings();
    } else if (activeTab === 'transactions') {
      fetchTransactions();
    } else if (activeTab === 'users') {
      fetchUsers(1, searchQuery);
    }
  }, [activeTab]);

  // Обработчик изменения настроек
  const handleSettingsChange = (field: keyof BonusSettings, value: number) => {
    if (settings) {
      setSettings({
        ...settings,
        [field]: value,
      });
    }
  };

  // Форматирование даты
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Получение цвета статуса транзакции
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600';
      case 'pending':
        return 'text-yellow-600';
      case 'cancelled':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  // Получение названия типа транзакции
  const getTransactionTypeName = (type: string) => {
    switch (type) {
      case 'booking':
        return 'Бронирование';
      case 'referral':
        return 'Реферальная программа';
      case 'manual':
        return 'Ручное начисление';
      case 'spent':
        return 'Списание';
      default:
        return type;
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Управление бонусной системой</h1>
      </div>
      
      <Link href="/admin/services" className="inline-block mb-6 text-[#48a9a6] hover:underline">
        <FaArrowLeft className="inline-block mr-2" />
        Вернуться к управлению услугами
      </Link>
      
      {/* Вкладки */}
      <div className="mb-6">
        <div className="flex border-b overflow-x-auto">
          <button
            className={`py-2 px-4 font-medium whitespace-nowrap ${activeTab === 'settings' ? 'text-[#48a9a6] border-b-2 border-[#48a9a6]' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('settings')}
          >
            Настройки
          </button>
          <button
            className={`py-2 px-4 font-medium whitespace-nowrap ${activeTab === 'transactions' ? 'text-[#48a9a6] border-b-2 border-[#48a9a6]' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('transactions')}
          >
            Транзакции
          </button>
          <button
            className={`py-2 px-4 font-medium whitespace-nowrap ${activeTab === 'users' ? 'text-[#48a9a6] border-b-2 border-[#48a9a6]' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('users')}
          >
            Пользователи
          </button>
        </div>
      </div>
      
      {/* Индикатор загрузки */}
      {loading && (
        <div className="flex justify-center items-center h-40">
          <div className="flex items-center justify-center space-x-2">
            <FaSpinner className="animate-spin text-[#48a9a6] text-2xl" />
            <span className="text-gray-600">Загрузка данных...</span>
          </div>
        </div>
      )}
      
      {/* Содержимое вкладки Пользователи */}
      {activeTab === 'users' && (
        <div>
          <h2 className="text-xl font-bold mb-4">Управление бонусами пользователей</h2>
          
          {/* Поиск пользователей */}
          <div className="mb-6">
            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <input 
                type="text" 
                placeholder="Поиск по имени, фамилии или email" 
                className="flex-grow border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#48a9a6]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button 
                type="submit" 
                className="bg-[#48a9a6] text-white px-4 py-2 rounded-lg hover:bg-[#3a8a87] transition-colors"
              >
                Найти
              </button>
            </form>
          </div>
          
          {loading ? (
            <div className="flex justify-center py-8">
              <FaSpinner className="animate-spin text-[#48a9a6] text-4xl" />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Список пользователей */}
              <div className="lg:col-span-1 border rounded-lg p-4">
                <h3 className="font-medium mb-4">Список пользователей</h3>
                
                {users.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    {searchQuery ? 'Нет пользователей, соответствующих критериям поиска' : 'Нет пользователей с бонусами'}
                  </div>
                ) : (
                  <div>
                    <div className="space-y-2 max-h-[500px] overflow-y-auto">
                      {users.map(user => (
                        <div 
                          key={user.id} 
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${selectedUser?.id === user.id ? 'bg-[#48a9a6]/10 border-[#48a9a6]' : 'hover:bg-gray-50'}`}
                          onClick={() => handleSelectUser(user)}
                        >
                          <div className="font-medium">{user.firstName} {user.lastName}</div>
                          <div className="text-sm text-gray-600">{user.email}</div>
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-xs text-gray-500">ID: {user.id.substring(0, 8)}...</span>
                            <span className="text-sm font-medium text-[#48a9a6]">{user.bonusBalance} бонусов</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Пагинация */}
                    {totalUsers > usersPerPage && (
                      <div className="flex justify-center mt-4">
                        <div className="flex items-center gap-2">
                          <button
                            className="px-3 py-1 border rounded-md disabled:opacity-50"
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                          >
                            &lt;
                          </button>
                          
                          <span className="text-sm">
                            Страница {currentPage} из {Math.ceil(totalUsers / usersPerPage)}
                          </span>
                          
                          <button
                            className="px-3 py-1 border rounded-md disabled:opacity-50"
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage >= Math.ceil(totalUsers / usersPerPage)}
                          >
                            &gt;
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Детали пользователя и управление бонусами */}
              <div className="lg:col-span-2">
                {!selectedUser ? (
                  <div className="border rounded-lg p-8 text-center text-gray-500">
                    Выберите пользователя из списка для управления бонусами
                  </div>
                ) : loadingUserData ? (
                  <div className="border rounded-lg p-8 flex justify-center">
                    <FaSpinner className="animate-spin text-[#48a9a6] text-4xl" />
                  </div>
                ) : (
                  <div>
                    {/* Информация о пользователе */}
                    <div className="border rounded-lg p-4 mb-6">
                      <h3 className="font-medium mb-4">Информация о пользователе</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Имя:</p>
                          <p className="font-medium">{selectedUser.firstName} {selectedUser.lastName}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Email:</p>
                          <p className="font-medium">{selectedUser.email}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">ID пользователя:</p>
                          <p className="font-medium text-xs break-all">{selectedUser.id}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Баланс бонусов:</p>
                          <p className="font-medium text-[#48a9a6] text-xl">{selectedUser.bonusBalance} бонусов</p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Форма для начисления/списания бонусов */}
                    <div className="border rounded-lg p-4 mb-6">
                      <h3 className="font-medium mb-4">Управление бонусами</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-gray-500 mb-1">Операция:</label>
                          <div className="flex border rounded-lg overflow-hidden">
                            <button
                              className={`flex-1 py-2 ${operation === 'add' ? 'bg-green-100 text-green-700' : 'bg-gray-50 text-gray-700'}`}
                              onClick={() => setOperation('add')}
                            >
                              Начисление
                            </button>
                            <button
                              className={`flex-1 py-2 ${operation === 'subtract' ? 'bg-red-100 text-red-700' : 'bg-gray-50 text-gray-700'}`}
                              onClick={() => setOperation('subtract')}
                            >
                              Списание
                            </button>
                          </div>
                        </div>
                        
                        <div>
                          <label htmlFor="bonusAmount" className="block text-sm text-gray-500 mb-1">Количество бонусов:</label>
                          <input
                            id="bonusAmount"
                            type="number"
                            min="1"
                            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#48a9a6]"
                            value={bonusAmount}
                            onChange={(e) => setBonusAmount(e.target.value)}
                          />
                        </div>
                        
                        <div className="md:col-span-2">
                          <label htmlFor="bonusDescription" className="block text-sm text-gray-500 mb-1">Описание (необязательно):</label>
                          <input
                            id="bonusDescription"
                            type="text"
                            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#48a9a6]"
                            value={bonusDescription}
                            onChange={(e) => setBonusDescription(e.target.value)}
                            placeholder="Причина начисления/списания бонусов"
                          />
                        </div>
                      </div>
                      
                      <div className="mt-4 flex justify-end">
                        <button
                          className={`px-4 py-2 rounded-lg ${
                            operation === 'add' 
                              ? 'bg-green-600 hover:bg-green-700' 
                              : 'bg-red-600 hover:bg-red-700'
                          } text-white disabled:opacity-50 disabled:cursor-not-allowed`}
                          onClick={handleBonusOperation}
                          disabled={processingBonus || !bonusAmount || isNaN(Number(bonusAmount)) || Number(bonusAmount) <= 0}
                        >
                          {processingBonus ? (
                            <FaSpinner className="animate-spin inline mr-2" />
                          ) : operation === 'add' ? (
                            'Начислить бонусы'
                          ) : (
                            'Списать бонусы'
                          )}
                        </button>
                      </div>
                    </div>
                    
                    {/* История транзакций пользователя */}
                    <div className="border rounded-lg p-4">
                      <h3 className="font-medium mb-4">История транзакций</h3>
                      {userTransactions.length === 0 ? (
                        <div className="text-center py-4 text-gray-500">
                          У пользователя нет истории бонусных транзакций
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Дата</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Тип</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Сумма</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Статус</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Описание</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {userTransactions.map(transaction => (
                                <tr key={transaction.id}>
                                  <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600">
                                    {formatDate(transaction.createdAt)}
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap text-sm">
                                    {getTransactionTypeName(transaction.type)}
                                  </td>
                                  <td className={`px-4 py-2 whitespace-nowrap text-sm font-medium ${transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {transaction.amount > 0 ? '+' : ''}{transaction.amount}
                                  </td>
                                  <td className="px-4 py-2 whitespace-nowrap text-sm">
                                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(transaction.status)}`}>
                                      {transaction.status === 'completed' ? 'Выполнено' : 
                                      transaction.status === 'pending' ? 'В обработке' : 'Отменено'}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-600">
                                    {transaction.description || '-'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Содержимое других вкладок... */}
      {activeTab === 'settings' && settings && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Настройки бонусной системы</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Бонус за бронирование (₽)
              </label>
              <input
                type="number"
                value={settings.bookingBonusAmount}
                onChange={(e) => handleSettingsChange('bookingBonusAmount', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#48a9a6]"
              />
              <p className="mt-1 text-sm text-gray-500">
                Сумма бонусов, начисляемая пользователю при бронировании услуги.
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Бонус приглашающему (₽)
              </label>
              <input
                type="number"
                value={settings.referrerBonusAmount}
                onChange={(e) => handleSettingsChange('referrerBonusAmount', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#48a9a6]"
              />
              <p className="mt-1 text-sm text-gray-500">
                Сумма бонусов, начисляемая пользователю, пригласившему нового клиента.
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Бонус приглашенному (₽)
              </label>
              <input
                type="number"
                value={settings.referralBonusAmount}
                onChange={(e) => handleSettingsChange('referralBonusAmount', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#48a9a6]"
              />
              <p className="mt-1 text-sm text-gray-500">
                Сумма бонусов, начисляемая новому пользователю при регистрации по реферальной ссылке.
              </p>
            </div>
            
            <div className="pt-4">
              <button
                onClick={saveSettings}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-[#48a9a6] text-white rounded-md hover:bg-[#3a8a87] disabled:bg-gray-400"
              >
                {saving ? <FaSpinner className="animate-spin" /> : <FaSave />}
                <span>{saving ? 'Сохранение...' : 'Сохранить настройки'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
      
      {activeTab === 'settings' && !settings && !loading && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="text-center py-8">
            <p className="text-gray-500">Настройки бонусной системы не найдены</p>
            <button
              onClick={fetchSettings}
              className="mt-4 px-4 py-2 bg-[#48a9a6] text-white rounded-md hover:bg-[#3a8a87]"
            >
              Обновить
            </button>
          </div>
        </div>
      )}
      
      {activeTab === 'transactions' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">История транзакций</h2>
          
          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Транзакции отсутствуют</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID пользователя</th>
                    <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Тип</th>
                    <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Сумма</th>
                    <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Статус</th>
                    <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Описание</th>
                    <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Дата</th>
                    <th className="py-2 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {transactions.map((transaction) => (
                    <tr key={transaction.id}>
                      <td className="py-3 px-4 text-sm">{transaction.userId}</td>
                      <td className="py-3 px-4 text-sm">{getTransactionTypeName(transaction.type)}</td>
                      <td className="py-3 px-4 text-sm font-medium" style={{ color: transaction.amount < 0 ? 'red' : 'green' }}>
                        {transaction.amount.toFixed(2)} ₽
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(transaction.status)}`}>
                          {transaction.status === 'completed' ? 'Выполнено' : 
                           transaction.status === 'pending' ? 'Ожидает' : 'Отменено'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm">{transaction.description || '-'}</td>
                      <td className="py-3 px-4 text-sm">{formatDate(transaction.createdAt)}</td>
                      <td className="py-3 px-4 text-sm">
                        {transaction.status === 'pending' && (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => updateTransactionStatus(transaction.id, 'completed')}
                              className="px-2 py-1 bg-green-100 text-green-800 rounded-md hover:bg-green-200"
                            >
                              Подтвердить
                            </button>
                            <button
                              onClick={() => updateTransactionStatus(transaction.id, 'cancelled')}
                              className="px-2 py-1 bg-red-100 text-red-800 rounded-md hover:bg-red-200"
                            >
                              Отменить
                            </button>
                          </div>
                        )}
                        {transaction.status === 'completed' && (
                          <button
                            onClick={() => updateTransactionStatus(transaction.id, 'cancelled')}
                            className="px-2 py-1 bg-red-100 text-red-800 rounded-md hover:bg-red-200"
                          >
                            Отменить
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 