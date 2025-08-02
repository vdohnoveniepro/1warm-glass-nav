'use client';

import React, { useState, useEffect } from 'react';
import { FaTimes, FaGoogle, FaKey, FaLink, FaUnlink, FaSync } from 'react-icons/fa';
import { toast } from '@/components/ui/Toast';

interface GoogleCalendarModalProps {
  specialistId: string;
  isOpen: boolean;
  onClose: () => void;
}

const GoogleCalendarModal = ({ specialistId, isOpen, onClose }: GoogleCalendarModalProps) => {
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  
  // Состояния для настроек синхронизации
  const [syncFromGoogle, setSyncFromGoogle] = useState(true);
  const [syncToGoogle, setSyncToGoogle] = useState(true);
  const [enableNotifications, setEnableNotifications] = useState(true);
  
  // Данные для интеграции с Google API
  const clientId = "395765096031-rp54n8fj9kt39s85al83cc89gl39t0h7.apps.googleusercontent.com";
  
  useEffect(() => {
    if (isOpen) {
      checkConnectionStatus();
    }
  }, [isOpen]);
  
  const checkConnectionStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/specialists/${specialistId}/google-calendar/status`);
      const data = await response.json();
      setConnected(data.connected || false);
    } catch (error) {
      console.error('Ошибка при проверке статуса подключения:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const connectGoogleCalendar = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/specialists/${specialistId}/google-calendar/connect`, { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        setConnected(true);
        toast.success('Календарь Google успешно подключен');
      }
    } catch (error) {
      console.error('Ошибка при подключении Google Calendar:', error);
      toast.error('Не удалось подключить Google Calendar');
    } finally {
      setLoading(false);
    }
  };
  
  const disconnectGoogleCalendar = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/specialists/${specialistId}/google-calendar/disconnect`, { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        setConnected(false);
        toast.success('Календарь Google отключен');
      }
    } catch (error) {
      console.error('Ошибка при отключении Google Calendar:', error);
      toast.error('Не удалось отключить Google Calendar');
    } finally {
      setLoading(false);
    }
  };
  
  const syncWithGoogleCalendar = async () => {
    try {
      setLoading(true);
      setSyncStatus('Синхронизация...');
      const response = await fetch(`/api/specialists/${specialistId}/google-calendar/sync`, { method: 'POST' });
      const data = await response.json();
      if (data.success) {
        setSyncStatus('Последняя синхронизация: только что');
        toast.success('Данные успешно синхронизированы');
      }
    } catch (error) {
      console.error('Ошибка при синхронизации с Google Calendar:', error);
      setSyncStatus('Ошибка синхронизации');
      toast.error('Не удалось синхронизировать данные');
    } finally {
      setLoading(false);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold flex items-center">
            <FaGoogle className="mr-2 text-[#4285F4]" /> Синхронизация с Google Календарем
          </h2>
          <button 
            className="text-gray-500 hover:text-gray-700" 
            onClick={onClose}
          >
            <FaTimes />
          </button>
        </div>
        
        <div className="p-5">
          {loading ? (
            <div className="flex justify-center items-center py-10">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#4285F4] border-r-2"></div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-700">
                  Синхронизация позволит автоматически отображать ваши записи к клиентам в вашем Google календаре, 
                  а также блокировать время, когда у вас уже есть встречи в Google календаре.
                </p>
              </div>
              
              {connected ? (
                <>
                  <div className="bg-green-50 p-4 rounded-lg flex items-start">
                    <div className="text-green-600 mr-3 mt-1">
                      <FaLink />
                    </div>
                    <div>
                      <p className="text-green-800 font-medium">Google Календарь подключен</p>
                      {syncStatus && (
                        <p className="text-sm text-green-700 mt-1">
                          {syncStatus}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex space-x-3">
                    <button
                      onClick={syncWithGoogleCalendar}
                      disabled={loading}
                      className="flex-1 bg-[#4285F4] text-white py-2 px-4 rounded-lg flex items-center justify-center hover:bg-[#4285F4]/90 transition-colors"
                    >
                      <FaSync className="mr-2" /> Синхронизировать сейчас
                    </button>
                    
                    <button
                      onClick={disconnectGoogleCalendar}
                      disabled={loading}
                      className="flex-1 bg-white text-red-600 border border-red-300 py-2 px-4 rounded-lg flex items-center justify-center hover:bg-red-50 transition-colors"
                    >
                      <FaUnlink className="mr-2" /> Отключить
                    </button>
                  </div>
                  
                  <div className="border-t pt-4 mt-4">
                    <h3 className="font-medium mb-2">Настройки синхронизации</h3>
                    
                    <div className="space-y-3">
                      <div className="flex items-start">
                        <input
                          type="checkbox"
                          id="sync-from-google"
                          className="mt-1 mr-2"
                          checked={syncFromGoogle}
                          onChange={(e) => setSyncFromGoogle(e.target.checked)}
                        />
                        <label htmlFor="sync-from-google" className="text-sm">
                          Синхронизировать события из Google календаря (блокировать время, занятое другими встречами)
                        </label>
                      </div>
                      
                      <div className="flex items-start">
                        <input
                          type="checkbox"
                          id="sync-to-google"
                          className="mt-1 mr-2"
                          checked={syncToGoogle}
                          onChange={(e) => setSyncToGoogle(e.target.checked)}
                        />
                        <label htmlFor="sync-to-google" className="text-sm">
                          Отправлять записи клиентов в Google календарь
                        </label>
                      </div>
                      
                      <div className="flex items-start">
                        <input
                          type="checkbox"
                          id="notifications"
                          className="mt-1 mr-2"
                          checked={enableNotifications}
                          onChange={(e) => setEnableNotifications(e.target.checked)}
                        />
                        <label htmlFor="notifications" className="text-sm">
                          Включить уведомления Google календаря о записях
                        </label>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-6">
                  <FaGoogle className="mx-auto text-[#4285F4] text-5xl mb-4" />
                  <h3 className="text-lg font-medium mb-2">Подключите свой Google Календарь</h3>
                  <p className="text-gray-600 mb-6">
                    Для синхронизации расписания необходимо предоставить доступ к вашему календарю Google
                  </p>
                  
                  <button
                    onClick={connectGoogleCalendar}
                    disabled={loading}
                    className="bg-[#4285F4] text-white py-2 px-6 rounded-lg flex items-center justify-center mx-auto hover:bg-[#4285F4]/90 transition-colors"
                  >
                    <FaKey className="mr-2" /> Подключить Google Календарь
                  </button>
                </div>
              )}
              
              <div className="bg-gray-50 p-4 rounded-lg mt-4">
                <h4 className="font-medium mb-2">Как это работает</h4>
                <ol className="list-decimal list-inside text-sm space-y-1 text-gray-700">
                  <li>Подключите свой аккаунт Google через безопасный протокол OAuth 2.0</li>
                  <li>Выберите календарь, с которым хотите выполнить синхронизацию</li>
                  <li>Новые записи клиентов будут автоматически добавляться в ваш Google календарь</li>
                  <li>События из вашего Google календаря будут учитываться при формировании расписания</li>
                </ol>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex justify-end p-4 border-t">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-100"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};

export default GoogleCalendarModal; 