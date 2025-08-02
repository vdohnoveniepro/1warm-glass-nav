import { useState } from 'react';
import { Specialist } from '@/models/types';

interface EditSpecialistLinkProps {
  specialist: Specialist;
  userId: string;
  duplicateSpecialists?: Specialist[];
  onAction: (action: string, data: any) => Promise<void>;
}

export default function EditSpecialistLink({
  specialist,
  userId,
  duplicateSpecialists = [],
  onAction,
}: EditSpecialistLinkProps) {
  const [isLoading, setIsLoading] = useState(false);
  const hasDuplicates = duplicateSpecialists.length > 0;

  const handleUnlinkSpecialist = async () => {
    if (!confirm('Вы уверены, что хотите отвязать этого специалиста от пользователя?')) {
      return;
    }
    
    setIsLoading(true);
    try {
      await onAction('unlinkSpecialist', {
        userId,
        specialistId: specialist.id,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSpecialist = async () => {
    if (!confirm('Вы уверены, что хотите удалить этого специалиста? Это действие нельзя отменить!')) {
      return;
    }
    
    setIsLoading(true);
    try {
      await onAction('deleteSpecialist', {
        userId,
        specialistId: specialist.id,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTransferSpecialist = async (targetSpecialistId: string) => {
    if (!confirm('Вы уверены, что хотите перенести связь на другого специалиста?')) {
      return;
    }
    
    setIsLoading(true);
    try {
      await onAction('transferSpecialist', {
        userId,
        specialistId: specialist.id,
        targetSpecialistId,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-4 border p-4 rounded-lg">
      <h3 className="text-lg font-semibold mb-2">Управление связью</h3>
      
      {hasDuplicates && (
        <div className="mb-4 p-3 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700">
          <p>Обнаружено несколько профилей специалиста для одного пользователя!</p>
          <p className="text-sm">Рекомендуется выбрать один профиль и удалить остальные.</p>
        </div>
      )}
      
      <div className="space-y-4">
        <div>
          <p className="mb-2">
            <strong>ID специалиста:</strong> {specialist.id}
          </p>
          <p className="mb-2">
            <strong>Имя:</strong> {specialist.firstName} {specialist.lastName}
          </p>
          <p className="mb-2">
            <strong>Должность:</strong> {specialist.position || 'Не указана'}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded"
            onClick={handleUnlinkSpecialist}
            disabled={isLoading}
          >
            {isLoading ? 'Загрузка...' : 'Отвязать от пользователя'}
          </button>
          
          <button
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded"
            onClick={handleDeleteSpecialist}
            disabled={isLoading}
          >
            {isLoading ? 'Загрузка...' : 'Удалить специалиста'}
          </button>
        </div>
        
        {hasDuplicates && (
          <div className="mt-4">
            <h4 className="font-medium mb-2">Перенести связь на другого специалиста:</h4>
            <div className="space-y-2">
              {duplicateSpecialists.map((duplicate) => (
                <div key={duplicate.id} className="p-2 border rounded flex justify-between items-center">
                  <div>
                    <p>
                      {duplicate.firstName} {duplicate.lastName} (ID: {duplicate.id})
                    </p>
                    {duplicate.position && (
                      <p className="text-sm text-gray-600">{duplicate.position}</p>
                    )}
                  </div>
                  <button
                    className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm"
                    onClick={() => handleTransferSpecialist(duplicate.id)}
                    disabled={isLoading || duplicate.id === specialist.id}
                  >
                    {isLoading ? 'Загрузка...' : 'Перенести'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 