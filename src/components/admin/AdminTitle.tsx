interface AdminTitleProps {
  title: string;
  subtitle?: string;
}

/**
 * Компонент для отображения заголовка на административных страницах
 */
export default function AdminTitle({ title, subtitle }: AdminTitleProps) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold">{title}</h1>
      {subtitle && <p className="text-gray-600 mt-1">{subtitle}</p>}
    </div>
  );
} 