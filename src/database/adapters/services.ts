import { servicesAPI, Service, ServiceWithSpecialists } from '../api/services';

/**
 * Адаптер для совместимости старого API услуг с SQLite
 */
export const servicesAdapter = {
  /**
   * Получить все услуги
   */
  getAll: (): Service[] => {
    return servicesAPI.getAll();
  },
  
  /**
   * Получить все услуги с информацией о специалистах
   */
  getAllWithSpecialists: (includeArchived: boolean = false): ServiceWithSpecialists[] => {
    return servicesAPI.getAllWithSpecialists(includeArchived);
  },
  
  /**
   * Получить услугу по ID
   */
  getById: (id: string): Service | null => {
    return servicesAPI.getById(id);
  },
  
  /**
   * Получить услугу по ID с информацией о специалистах
   */
  getWithSpecialists: (id: string): ServiceWithSpecialists | null => {
    return servicesAPI.getWithSpecialists(id);
  },
  
  /**
   * Создать новую услугу
   */
  create: (data: any): Service => {
    const service: Partial<Service> = {
      name: data.name,
      description: data.description || null,
      shortDescription: data.shortDescription || null,
      image: data.image || null,
      price: parseFloat(data.price) || 0,
      duration: parseInt(data.duration) || 60,
      color: data.color || null,
      order: parseInt(data.order) || 0,
      isArchived: data.isArchived ? 1 : 0
    };
    
    // Специалисты из разных форматов данных
    const specialistIds = data.specialists
      ? data.specialists.map((s: any) => typeof s === 'string' ? s : s.id)
      : [];
    
    return servicesAPI.create(service, specialistIds);
  },
  
  /**
   * Обновить услугу
   */
  update: (id: string, data: any): Service | null => {
    // Получаем текущую услугу
    const currentService = servicesAPI.getById(id);
    if (!currentService) {
      return null;
    }
    
    const service: Partial<Service> = {
      name: data.name,
      description: data.description,
      shortDescription: data.shortDescription,
      image: data.image,
      price: parseFloat(data.price) || currentService.price,
      duration: parseInt(data.duration) || currentService.duration,
      color: data.color,
      order: data.order !== undefined ? parseInt(data.order) : currentService.order,
      isArchived: data.isArchived !== undefined ? (data.isArchived ? 1 : 0) : currentService.isArchived
    };
    
    // Специалисты из разных форматов данных
    let specialistIds;
    if (data.specialists !== undefined) {
      specialistIds = data.specialists
        ? data.specialists.map((s: any) => typeof s === 'string' ? s : s.id)
        : [];
    }
    
    return servicesAPI.update(id, service, specialistIds);
  },
  
  /**
   * Удалить услугу
   */
  delete: (id: string): boolean => {
    return servicesAPI.delete(id);
  },
  
  /**
   * Поиск услуг
   */
  search: (query: string): Service[] => {
    return servicesAPI.search(query);
  }
}; 