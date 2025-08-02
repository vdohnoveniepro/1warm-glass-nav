export default function CalendarLoading() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="flex flex-col justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-[#48a9a6] border-r-2"></div>
        <p className="mt-4 text-gray-600">Загрузка календаря...</p>
      </div>
    </div>
  );
} 