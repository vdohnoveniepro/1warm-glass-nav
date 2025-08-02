'use client';
export const dynamic = 'force-dynamic'

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/AuthContext';
import { useRouter } from 'next/navigation';
import { FaArrowLeft, FaSpinner, FaGift, FaHistory, FaLink, FaCopy, FaCheck, FaUserPlus, FaCalendarAlt } from 'react-icons/fa';
import { toast } from '@/components/ui/Toast';

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

interface ReferredUser {
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
  createdAt: string;
}

export default function BonusPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [bonusBalance, setBonusBalance] = useState(0);
  const [transactions, setTransactions] = useState<BonusTransaction[]>([]);
  const [referredUsers, setReferredUsers] = useState<ReferredUser[]>([]);
  const [referralCode, setReferralCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [referralLink, setReferralLink] = useState('');
  const [telegramReferralLink, setTelegramReferralLink] = useState('');
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  
  // Добавляем состояния для пагинации
  const [visibleTransactions, setVisibleTransactions] = useState<BonusTransaction[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreTransactions, setHasMoreTransactions] = useState(false);
  const transactionsPerPage = 5;
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [copiedTelegram, setCopiedTelegram] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    const fetchBonusData = async () => {
      setIsLoading(true);
      try {
        // Получаем баланс бонусов
        const balanceResponse = await fetch(`/api/bonus/user/${user.id}`);
        
        if (balanceResponse.ok) {
          const balanceData = await balanceResponse.json();
          if (balanceData.success) {
            setBonusBalance(balanceData.balance);
            setReferralCode(balanceData.referralCode || '');
            
            if (balanceData.referralCode) {
              setReferralLink(`${window.location.origin}/register?ref=${balanceData.referralCode}`);
              setTelegramReferralLink(`https://t.me/vdohnoveniepro_bot/shop?startapp=ref-${balanceData.referralCode}`);
            } else {
              // Если реферального кода нет, автоматически генерируем его
              generateReferralCode();
            }
          } else {
            console.error('Ошибка в ответе API баланса бонусов:', balanceData.message || 'Неизвестная ошибка');
            // Устанавливаем значения по умолчанию
            setBonusBalance(0);
          }
        } else {
          console.error('Ошибка запроса баланса бонусов:', balanceResponse.statusText);
          // Устанавливаем значения по умолчанию
          setBonusBalance(0);
        }
        
        // Получаем историю транзакций
        const transactionsResponse = await fetch(`/api/bonus/transactions?userId=${user.id}`);
        
        if (transactionsResponse.ok) {
          const transactionsData = await transactionsResponse.json();
          if (transactionsData.success) {
            const allTransactions = transactionsData.transactions;
            setTransactions(allTransactions);
            
            // Инициализируем видимые транзакции
            const initialTransactions = allTransactions.slice(0, transactionsPerPage);
            setVisibleTransactions(initialTransactions);
            setHasMoreTransactions(allTransactions.length > transactionsPerPage);
          } else {
            console.error('Ошибка в ответе API транзакций:', transactionsData.message || 'Неизвестная ошибка');
            // Устанавливаем значения по умолчанию
            setTransactions([]);
            setVisibleTransactions([]);
            setHasMoreTransactions(false);
          }
        } else {
          console.error('Ошибка запроса транзакций:', transactionsResponse.statusText);
          // Устанавливаем значения по умолчанию
          setTransactions([]);
          setVisibleTransactions([]);
          setHasMoreTransactions(false);
        }
        
        // Получаем список приглашенных пользователей
        const referralsResponse = await fetch(`/api/bonus/referrals?userId=${user.id}`);
        
        if (referralsResponse.ok) {
          const referralsData = await referralsResponse.json();
          if (referralsData.success) {
            setReferredUsers(referralsData.referredUsers || []);
          } else {
            console.error('Ошибка в ответе API рефералов:', referralsData.message || 'Неизвестная ошибка');
            // Устанавливаем значения по умолчанию
            setReferredUsers([]);
          }
        } else {
          console.error('Ошибка запроса рефералов:', referralsResponse.statusText);
          // Устанавливаем значения по умолчанию
          setReferredUsers([]);
        }
      } catch (error) {
        console.error('Ошибка при загрузке данных о бонусах:', error);
        toast.error('Не удалось загрузить данные о бонусах');
        // Устанавливаем значения по умолчанию
        setBonusBalance(0);
        setTransactions([]);
        setVisibleTransactions([]);
        setHasMoreTransactions(false);
        setReferredUsers([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchBonusData();
  }, [user, router]);
  
  // Функция для принудительной генерации реферального кода
  const generateReferralCode = async () => {
    if (!user) return;
    
    setIsGeneratingCode(true);
    try {
      // Отправляем запрос на генерацию нового реферального кода
      const response = await fetch(`/api/bonus/user/${user.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ generateCode: true })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.referralCode) {
          setReferralCode(data.referralCode);
          setReferralLink(`${window.location.origin}/register?ref=${data.referralCode}`);
          setTelegramReferralLink(`https://t.me/vdohnoveniepro_bot/shop?startapp=ref-${data.referralCode}`);
          toast.success('Реферальный код успешно сгенерирован');
        } else {
          toast.error('Не удалось сгенерировать реферальный код');
        }
      } else {
        toast.error('Ошибка при генерации реферального кода');
      }
    } catch (error) {
      console.error('Ошибка при генерации реферального кода:', error);
      toast.error('Произошла ошибка при генерации реферального кода');
    } finally {
      setIsGeneratingCode(false);
    }
  };
  
  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success('Ссылка скопирована в буфер обмена');
    
    setTimeout(() => {
      setCopied(false);
    }, 3000);
  };
  
  const copyTelegramReferralLink = () => {
    navigator.clipboard.writeText(telegramReferralLink);
    setCopiedTelegram(true);
    toast.success('Telegram ссылка скопирована в буфер обмена');
    
    setTimeout(() => {
      setCopiedTelegram(false);
    }, 3000);
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    });
  };
  
  const getTransactionTypeText = (type: string) => {
    switch (type) {
      case 'booking':
        return 'Запись на услугу';
      case 'referral':
        return 'Реферальная программа';
      case 'manual':
        return 'Начисление администратором';
      case 'spent':
        return 'Списание за услугу';
      default:
        return type;
    }
  };
  
  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Ожидает подтверждения';
      case 'completed':
        return 'Подтверждено';
      case 'cancelled':
        return 'Отменено';
      default:
        return status;
    }
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'cancelled':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  // Функция для загрузки следующей страницы транзакций
  const loadMoreTransactions = () => {
    setIsLoadingMore(true);
    
    setTimeout(() => {
      const nextPage = currentPage + 1;
      const startIndex = 0;
      const endIndex = nextPage * transactionsPerPage;
      
      setVisibleTransactions(transactions.slice(startIndex, endIndex));
      setCurrentPage(nextPage);
      setHasMoreTransactions(endIndex < transactions.length);
      setIsLoadingMore(false);
    }, 500); // Добавляем небольшую задержку для лучшего UX
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <Link href="/cabinet" className="inline-flex items-center text-[#48a9a6] hover:underline mb-4">
          <FaArrowLeft className="mr-2" />
          <span>Вернуться в кабинет</span>
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">Бонусная программа</h1>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <FaSpinner className="animate-spin text-[#48a9a6] text-4xl" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Карточка с балансом */}
          <div className="bg-white rounded-lg shadow-sm p-6 lg:col-span-1">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Ваш баланс</h2>
              <FaGift className="text-[#48a9a6] text-2xl" />
            </div>
            <div className="text-3xl font-bold text-[#48a9a6] mb-4">
              {bonusBalance} ₽
            </div>
            <p className="text-gray-600 mb-4">
              Используйте бонусы при бронировании услуг для получения скидки до 50% от стоимости.
            </p>
            <Link href="/services" className="inline-block w-full text-center bg-[#48a9a6] text-white py-2 px-4 rounded-md hover:bg-[#3d908d] transition-colors">
              <div className="flex items-center justify-center gap-2">
                <FaCalendarAlt />
                <span>Забронировать услугу</span>
              </div>
            </Link>
          </div>
          
          {/* Реферальная программа */}
          <div className="bg-white rounded-lg shadow-sm p-6 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Реферальная программа</h2>
              <FaUserPlus className="text-[#48a9a6] text-2xl" />
            </div>
            <p className="text-gray-600 mb-4">
              Пригласите друзей и получите 2000 бонусов за каждого зарегистрировавшегося пользователя, который воспользуется услугами нашего центра.
            </p>
            
            {referralCode ? (
              <div className="mb-6">
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-3">Ваша реферальная ссылка</h3>
                  <div className="flex flex-col md:flex-row gap-3 mb-4">
                    <div className="flex-grow">
                      <div className="relative">
                        <input 
                          type="text" 
                          readOnly 
                          value={referralLink} 
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg text-sm"
                        />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <button 
                            onClick={copyReferralLink}
                            className={`p-1.5 rounded-md ${copied ? 'text-green-600' : 'text-gray-500 hover:text-gray-700'}`}
                            aria-label="Копировать ссылку"
                          >
                            {copied ? (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">Эта ссылка для обычного браузера и компьютера</p>
                    </div>
                  </div>
                  
                  <h3 className="text-lg font-semibold mb-3">Ссылка для Telegram</h3>
                  <div className="flex flex-col md:flex-row gap-3 mb-4">
                    <div className="flex-grow">
                      <div className="relative">
                        <input 
                          type="text" 
                          readOnly 
                          value={telegramReferralLink} 
                          className="w-full px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg text-sm"
                        />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <button 
                            onClick={copyTelegramReferralLink}
                            className={`p-1.5 rounded-md ${copiedTelegram ? 'text-green-600' : 'text-blue-600 hover:text-blue-800'}`}
                            aria-label="Копировать Telegram ссылку"
                          >
                            {copiedTelegram ? (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-blue-600 mt-1">Для отправки в Telegram. Автоматически откроется мини-приложение</p>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-4">
                    Поделитесь этой ссылкой с друзьями. Когда они зарегистрируются по ней, вы оба получите бонусы!
                  </p>
                </div>
              </div>
            ) : (
              <div className="mb-6">
                <div className="p-4 bg-blue-50 text-blue-700 rounded-md mb-4">
                  Генерация вашей реферальной ссылки... Пожалуйста, подождите.
                </div>
                <div className="flex justify-center">
                  <FaSpinner className="animate-spin text-[#48a9a6] text-xl" />
                </div>
              </div>
            )}
            
            <div>
              <h3 className="text-lg font-medium mb-3">Приглашенные пользователи</h3>
              {referredUsers.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Пользователь
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Дата регистрации
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {referredUsers.map((referral) => (
                        <tr key={referral.user.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {referral.user.firstName} {referral.user.lastName}
                            </div>
                            <div className="text-sm text-gray-500">{referral.user.email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(referral.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center p-6 bg-gray-50 rounded-md">
                  <p className="text-gray-500">У вас пока нет приглашенных пользователей</p>
                </div>
              )}
            </div>
          </div>
          
          {/* История транзакций */}
          <div className="bg-white rounded-lg shadow-sm p-6 lg:col-span-3">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800">История транзакций</h2>
              <FaHistory className="text-[#48a9a6] text-2xl" />
            </div>
            
            {visibleTransactions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Дата
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Тип
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Описание
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Сумма
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Статус
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {visibleTransactions.map((transaction) => (
                      <tr key={transaction.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(transaction.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {getTransactionTypeText(transaction.type)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {transaction.description || '-'}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {transaction.amount > 0 ? '+' : ''}{transaction.amount} ₽
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(transaction.status)}`}>
                            {getStatusText(transaction.status)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center p-6 bg-gray-50 rounded-md">
                <p className="text-gray-500">У вас пока нет транзакций</p>
              </div>
            )}
            
            {hasMoreTransactions && (
              <div className="text-center mt-4">
                <button 
                  onClick={loadMoreTransactions}
                  disabled={isLoadingMore}
                  className="text-[#48a9a6] hover:underline flex items-center justify-center mx-auto"
                >
                  {isLoadingMore ? (
                    <>
                      <FaSpinner className="animate-spin mr-2" />
                      Загрузка...
                    </>
                  ) : (
                    <>Загрузить еще</>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 