import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md text-center">
        <h2 className="text-3xl font-bold text-[#48a9a6] mb-4">404</h2>
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Страница не найдена</h3>
        <p className="text-gray-700 mb-6">
          Запрашиваемая страница не существует или была перемещена.
        </p>
        <Link
          href="/"
          className="px-4 py-2 bg-[#48a9a6] text-white rounded-md hover:bg-[#3a8a87] transition-colors inline-block"
        >
          Вернуться на главную
        </Link>
      </div>
    </div>
  );
} 