// Функция для получения pipeline_id
const getPipelineId = async () => {
  try {
    const headers = {
      'X-Key': `Key ${FUSION_BRAIN_API_KEY}`,
      'X-Secret': `Secret ${FUSION_BRAIN_SECRET_KEY}`
    };
    
    const response = await fetch(`${FUSION_BRAIN_URL}key/api/v1/pipelines`, {
      method: 'GET',
      headers
    });
    
    if (!response.ok) {
      throw new Error(`Ошибка при получении pipeline_id: ${response.status}`);
    }
    
    const data = await response.json();
    if (data && data.length > 0) {
      setPipelineId(data[0].id);
    } else {
      throw new Error('Не удалось получить pipeline_id');
    }
  } catch (err) {
    console.error('Ошибка при получении pipeline_id:', err);
    setError(`Ошибка инициализации API для генерации изображений: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`);
  }
};

// Получаем pipeline_id при загрузке компонента или переключении на режим изображения
useEffect(() => {
  if (isOpen && mode === 'image' && !pipelineId) {
    getPipelineId();
  }
}, [isOpen, mode, pipelineId]); 