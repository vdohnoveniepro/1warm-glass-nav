export interface Service {
  id: string;
  name: string;            // имя услуги
  description: string;     // описание услуги
  shortDescription?: string; // краткое описание услуги
  image: string;           // путь к изображению услуги
  price: number;           // стоимость услуги
  duration: number;        // длительность в минутах
  color: string;           // цвет для отображения в интерфейсе
  specialists: Array<{     // массив специалистов, оказывающих услугу
    id: string;
    firstName: string;
    lastName: string;
    photo: string;
  }>;
  order: number;           // порядок отображения
  isArchived: boolean;     // статус архивации
  createdAt?: string;      // дата создания
  updatedAt?: string;      // дата обновления
}

export interface ServiceFormData {
  id?: string;             // ID услуги (при редактировании)
  name: string;
  description: string;
  shortDescription?: string; // краткое описание услуги
  image?: string;
  price: number;
  duration: number;
  color?: string;
  specialists?: Array<{
    id: string;
  }>;
  isArchived?: boolean;    // статус архивации
} 