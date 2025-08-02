import { ReactNode } from 'react';

interface SettingsCardProps {
  title: string;
  description?: string;
  children: ReactNode;
}

/**
 * Компонент для отображения карточки с настройками
 */
export default function SettingsCard({ title, description, children }: SettingsCardProps) {
  return (
    <div className="card bg-base-100 shadow-md">
      <div className="card-body">
        <h3 className="card-title text-lg font-semibold">{title}</h3>
        {description && <p className="text-sm text-gray-600 mb-4">{description}</p>}
        <div className="p-1">{children}</div>
      </div>
    </div>
  );
} 