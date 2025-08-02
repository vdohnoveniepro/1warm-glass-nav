// Функция для загрузки специалистов
const fetchSpecialists = async () => {
  setLoading(true);
  setError(null);

  try {
    // Формируем URL с параметрами
    let url = '/api/specialists';
    if (selectedService) {
      url += `?serviceId=${selectedService}`;
    }

    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Ошибка: ${response.status}`);
    }
    
    const data = await response.json();
    
    // API теперь возвращает массив напрямую
    setSpecialists(data || []);
    setFilteredSpecialists(data || []);
  } catch (error) {
    console.error('Ошибка при загрузке специалистов:', error);
    setError('Не удалось загрузить данные');
  } finally {
    setLoading(false);
  }
}; 