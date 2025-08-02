'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import EditSpecialistLink from '../edit-link';

interface Specialist {
  id: string;
  firstName: string;
  lastName: string;
  position: string | null;
  userId: string | null;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  specialistId: string | null;
}

function ManageDuplicatesContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<{
    [userId: string]: {
      user: User;
      specialists: Specialist[];
    };
  }>({});

  // Получение данных о дубликатах
  useEffect(() => {
    const fetchDuplicates = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/admin/specialists?duplicates=true');
        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Не удалось получить данные о дубликатах');
        }

        setDuplicates(result.data.duplicates || {});
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Произошла ошибка при загрузке данных');
      } finally {
        setLoading(false);
      }
    };

    fetchDuplicates();
  }, []);

  // Обработка действий с профилями специалистов
  const handleAction = async (action: string, data: any) => {
    try {
      const response = await fetch('/api/admin/specialists/user-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          ...data,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Не удалось выполнить действие');
      }

      // Обновляем UI после успешного действия - убираем обработанного специалиста
      setDuplicates((prev) => {
        const newDuplicates = { ...prev };
        
        if (data.userId in newDuplicates) {
          const specialists = newDuplicates[data.userId].specialists.filter(
            (s) => s.id !== data.specialistId
          );
          
          if (specialists.length <= 1) {
            // Если остался только один специалист, удаляем запись
            delete newDuplicates[data.userId];
          } else {
            // Обновляем список специалистов
            newDuplicates[data.userId] = {
              ...newDuplicates[data.userId],
              specialists,
            };
          }
        }
        
        return newDuplicates;
      });

      // Показываем сообщение об успехе
      alert('Действие выполнено успешно');
      
      // Обновляем страницу через небольшую задержку
      setTimeout(() => {
        router.refresh();
      }, 1000);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Произошла ошибка');
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Управление дубликатами профилей</h1>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6 mb-4"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Управление дубликатами профилей</h1>
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6">
          <p>{error}</p>
        </div>
        <button
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded"
          onClick={() => window.location.reload()}
        >
          Попробовать снова
        </button>
      </div>
    );
  }

  const hasDuplicates = Object.keys(duplicates).length > 0;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Управление дубликатами профилей</h1>
        <Link href="/admin/specialists" className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded">
          Назад к списку
        </Link>
      </div>

      {!hasDuplicates ? (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4">
          <p>Дубликатов профилей специалистов не обнаружено.</p>
        </div>
      ) : (
        <div>
          <p className="mb-6">
            Найдены пользователи с несколькими профилями специалистов. Для каждого пользователя
            рекомендуется оставить только один профиль специалиста.
          </p>

          <div className="space-y-8">
            {Object.entries(duplicates).map(([userId, { user, specialists }]) => (
              <div key={userId} className="border rounded-lg overflow-hidden">
                <div className="bg-gray-100 p-4">
                  <h2 className="text-xl font-semibold">
                    {user.firstName} {user.lastName}
                  </h2>
                  <p className="text-gray-600">{user.email}</p>
                  <p className="text-gray-600">ID пользователя: {userId}</p>
                  <p className="text-gray-600">
                    Активный ID специалиста: {user.specialistId || 'не задан'}
                  </p>
                </div>

                <div className="p-4">
                  <h3 className="text-lg font-medium mb-4">
                    Найдено {specialists.length} профилей специалиста:
                  </h3>

                  <div className="space-y-4">
                    {specialists.map((specialist) => (
                      <div key={specialist.id} className="border-t pt-4">
                        <EditSpecialistLink
                          specialist={specialist}
                          userId={userId}
                          duplicateSpecialists={specialists.filter((s) => s.id !== specialist.id)}
                          onAction={handleAction}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ManageDuplicatesPage() {
  return (
    <Suspense fallback={
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Управление дубликатами профилей</h1>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6 mb-4"></div>
        </div>
      </div>
    }>
      <ManageDuplicatesContent />
    </Suspense>
  );
} 