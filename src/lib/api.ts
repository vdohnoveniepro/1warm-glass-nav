import fs from 'fs';
import path from 'path';
import { processImageFromBase64 } from './imageProcessing';
import { db } from '../database/db';

// Импортируем адаптеры из базы данных SQLite
import { servicesAdapter, specialistsAdapter, articlesAdapter } from '../database/adapters';
import { initDB } from '../app/api/db';
import { 
  usersAPI as usersAPIFromDB,
  appointmentsAPI,
  bonusAPI,
  commentsAPI
} from '../database/api';
import { servicesAPI as servicesAPIFromDB } from '../database/api/services';

// Убедимся, что база данных инициализирована
try {
  initDB();
} catch (error) {
  console.error('Ошибка при инициализации базы данных:', error);
}

// Экспортируем API через адаптеры для совместимости
export const servicesAPI = servicesAPIFromDB;
export const specialistsAPI = specialistsAdapter;
export const articlesAPI = articlesAdapter;

// Экспортируем также API пользователей и другие API
export const usersAPI = usersAPIFromDB;
export { appointmentsAPI, bonusAPI, commentsAPI };

// Пути к папкам для медиа-файлов
export const SPECIALISTS_IMAGES_DIR = path.join(process.cwd(), 'public/images/specialists');
export const SPECIALISTS_DOCUMENTS_DIR = path.join(process.cwd(), 'public/documents/specialists');
export const SERVICES_IMAGES_DIR = path.join(process.cwd(), 'public/images/services');
export const ARTICLES_IMAGES_DIR = path.join(process.cwd(), 'public/images/blog');
export const USERS_IMAGES_DIR = path.join(process.cwd(), 'public/images/users');

// Функция для проверки и создания директорий
export const ensureDirectories = () => {
  const directories = [
    SPECIALISTS_IMAGES_DIR,
    SPECIALISTS_DOCUMENTS_DIR,
    SERVICES_IMAGES_DIR,
    ARTICLES_IMAGES_DIR,
    USERS_IMAGES_DIR,
    path.join(process.cwd(), 'public/images'),
    path.join(process.cwd(), 'public/documents')
  ];
  
  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Создана директория: ${dir}`);
    }
  });
};

// Вызываем при инициализации
ensureDirectories();

// Функции для работы с файлами изображений
export const saveImageFromBase64 = async (base64Image: string, directory: string = 'images'): Promise<string> => {
  try {
    if (!base64Image.startsWith('data:image')) {
      return base64Image; // Возвращаем исходный URL, если это не base64
    }
    
    // Создаем директорию, если она не существует
    const uploadDir = path.join(process.cwd(), 'public', directory);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    // Обрабатываем изображение и получаем путь к файлу
    const filePath = await processImageFromBase64(base64Image, uploadDir);
    
    // Возвращаем относительный путь для веб
    return filePath.replace(path.join(process.cwd(), 'public'), '');
  } catch (error) {
    console.error('Ошибка при сохранении изображения:', error);
    return '';
  }
};

export const deleteImage = (imagePath: string): boolean => {
  try {
    if (!imagePath) {
      console.log(`[deleteImage] Путь к изображению не указан`);
      return false;
    }
    
    if (imagePath.startsWith('http') || imagePath.includes('placeholder')) {
      console.log(`[deleteImage] Пропуск внешнего изображения или плейсхолдера: ${imagePath}`);
      return false; // Пропускаем внешние изображения и плейсхолдеры
    }
    
    // Нормализуем путь (убираем начальный слеш, если есть)
    const normalizedPath = imagePath.startsWith('/') ? imagePath.substring(1) : imagePath;
    
    // Преобразуем URL в путь к файлу
    const filePath = path.join(process.cwd(), 'public', normalizedPath);
    
    console.log(`[deleteImage] Попытка удаления файла: ${filePath}`);
    
    // Проверяем существование файла
    if (!fs.existsSync(filePath)) {
      console.warn(`[deleteImage] Файл для удаления не найден: ${filePath}`);
    } else {
      // Удаляем файл
      fs.unlinkSync(filePath);
      console.log(`[deleteImage] Файл успешно удален: ${filePath}`);
    }
    
    // Проверяем и удаляем WebP версию, если она может существовать
    const webpPath = normalizedPath.replace(/\.(jpg|jpeg|png)$/i, '.webp');
    if (webpPath !== normalizedPath) {
      const webpFilePath = path.join(process.cwd(), 'public', webpPath);
      console.log(`[deleteImage] Проверка наличия WebP версии: ${webpFilePath}`);
      
      if (fs.existsSync(webpFilePath)) {
        fs.unlinkSync(webpFilePath);
        console.log(`[deleteImage] WebP версия файла успешно удалена: ${webpFilePath}`);
      }
    }
    
    // Проверяем и удаляем миниатюры, если они могут существовать
    const thumbPath = normalizedPath.replace(/(\.[^.]+)$/, '-thumb$1');
    const thumbFilePath = path.join(process.cwd(), 'public', thumbPath);
    console.log(`[deleteImage] Проверка наличия миниатюры: ${thumbFilePath}`);
    
    if (fs.existsSync(thumbFilePath)) {
      fs.unlinkSync(thumbFilePath);
      console.log(`[deleteImage] Миниатюра файла успешно удалена: ${thumbFilePath}`);
    }
    
    // Проверяем и удаляем WebP версию миниатюры
    const thumbWebpPath = thumbPath.replace(/\.(jpg|jpeg|png)$/i, '.webp');
    if (thumbWebpPath !== thumbPath) {
      const thumbWebpFilePath = path.join(process.cwd(), 'public', thumbWebpPath);
      console.log(`[deleteImage] Проверка наличия WebP версии миниатюры: ${thumbWebpFilePath}`);
      
      if (fs.existsSync(thumbWebpFilePath)) {
        fs.unlinkSync(thumbWebpFilePath);
        console.log(`[deleteImage] WebP версия миниатюры успешно удалена: ${thumbWebpFilePath}`);
      }
    }
    
    return true;
  } catch (error) {
    console.error('[deleteImage] Ошибка при удалении изображения:', error);
    return false;
  }
};

// Функции для работы с документами
export const saveDocumentFromBase64 = async (
  base64Doc: string,
  fileName: string,
  directory: string = 'documents'
): Promise<string> => {
  try {
    if (!base64Doc.startsWith('data:')) {
      return base64Doc; // Возвращаем исходный URL, если это не base64
    }
    
    // Создаем директорию, если она не существует
    const uploadDir = path.join(process.cwd(), 'public', directory);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    // Определение расширения файла из base64
    const matches = base64Doc.match(/^data:(.+);base64,/);
    let extension = 'pdf';
    if (matches && matches[1]) {
      const mimeType = matches[1];
      if (mimeType.includes('pdf')) extension = 'pdf';
      else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) extension = 'jpg';
      else if (mimeType.includes('png')) extension = 'png';
      else if (mimeType.includes('gif')) extension = 'gif';
    }
    
    // Очищаем имя файла от специальных символов
    const safeFileName = fileName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const timestamp = Date.now();
    const filePath = path.join(uploadDir, `${safeFileName}_${timestamp}.${extension}`);
    
    // Конвертируем base64 в буфер и сохраняем
    const base64Data = base64Doc.replace(/^data:.+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(filePath, buffer);
    
    // Возвращаем относительный путь для веб
    return filePath.replace(path.join(process.cwd(), 'public'), '');
  } catch (error) {
    console.error('Ошибка при сохранении документа:', error);
    return '';
  }
};

export const deleteDocument = (docPath: string): boolean => {
  try {
    if (!docPath) {
      console.log(`[deleteDocument] Путь к документу не указан`);
      return false;
    }
    
    if (docPath.startsWith('http')) {
      console.log(`[deleteDocument] Пропуск внешнего документа: ${docPath}`);
      return false; // Пропускаем внешние документы
    }
    
    // Нормализуем путь (убираем начальный слеш, если есть)
    const normalizedPath = docPath.startsWith('/') ? docPath.substring(1) : docPath;
    
    // Преобразуем URL в путь к файлу
    const filePath = path.join(process.cwd(), 'public', normalizedPath);
    
    console.log(`[deleteDocument] Попытка удаления документа: ${filePath}`);
    
    // Проверяем существование файла
    if (!fs.existsSync(filePath)) {
      console.warn(`[deleteDocument] Документ для удаления не найден: ${filePath}`);
      return false;
    }
    
    // Удаляем файл
    fs.unlinkSync(filePath);
    console.log(`[deleteDocument] Документ успешно удален: ${filePath}`);
    return true;
  } catch (error) {
    console.error('[deleteDocument] Ошибка при удалении документа:', error);
    return false;
  }
};

// Функция для очистки неактуальных связей и файлов
export const cleanupRelations = (): boolean => {
  try {
    console.log('Запуск очистки неактуальных файлов...');
    
    // Очистка фото специалистов
    cleanupSpecialistFiles();
    
    // Очистка фото услуг
    cleanupServiceFiles();
    
    // Очистка фото блога
    cleanupArticleFiles();
    
    // Очистка фото пользователей
    cleanupUserFiles();
    
    console.log('Очистка неактуальных файлов успешно завершена');
    return true;
  } catch (error) {
    console.error('Ошибка при очистке неактуальных файлов:', error);
    return false;
  }
};

// Очистка фото специалистов
function cleanupSpecialistFiles() {
  // Получаем все фото специалистов из базы данных
  const usedPhotos = new Set<string>();
  
  try {
    const specialists = db.prepare('SELECT photo FROM specialists WHERE photo IS NOT NULL').all() as { photo: string }[];
    specialists.forEach(specialist => {
      if (specialist.photo) {
        usedPhotos.add(specialist.photo.replace(/^\//, '')); // Убираем начальный слеш
      }
    });
    
    // Получаем документы специалистов
    const documents = db.prepare('SELECT path FROM specialist_documents WHERE path IS NOT NULL').all() as { path: string }[];
    documents.forEach(doc => {
      if (doc.path) {
        usedPhotos.add(doc.path.replace(/^\//, '')); // Убираем начальный слеш
      }
    });
    
    // Проверяем все файлы в директории специалистов
    cleanupDirectory('public/images/specialists', usedPhotos);
    cleanupDirectory('public/documents/specialists', usedPhotos);
  } catch (error) {
    console.error('Ошибка при очистке файлов специалистов:', error);
  }
}

// Очистка фото услуг
function cleanupServiceFiles() {
  // Получаем все изображения услуг из базы данных
  const usedImages = new Set<string>();
  
  try {
    const services = db.prepare('SELECT image FROM services WHERE image IS NOT NULL').all() as { image: string }[];
    services.forEach(service => {
      if (service.image) {
        usedImages.add(service.image.replace(/^\//, '')); // Убираем начальный слеш
      }
    });
    
    // Проверяем все файлы в директории услуг
    cleanupDirectory('public/images/services', usedImages);
  } catch (error) {
    console.error('Ошибка при очистке файлов услуг:', error);
  }
}

// Очистка фото блога
function cleanupArticleFiles() {
  // Получаем все баннеры статей из базы данных
  const usedImages = new Set<string>();
  
  try {
    // Получаем баннеры статей
    const articles = db.prepare('SELECT banner, content FROM articles WHERE banner IS NOT NULL OR content IS NOT NULL').all() as { banner: string, content: string }[];
    
    articles.forEach(article => {
      // Добавляем баннер
      if (article.banner) {
        usedImages.add(article.banner.replace(/^\//, '')); // Убираем начальный слеш
      }
      
      // Ищем все изображения в контенте
      if (article.content) {
        const imgRegex = /\/images\/blog\/[^"')]+\.(jpg|jpeg|png|gif|webp)/g;
        const matches = article.content.match(imgRegex);
        
        if (matches) {
          matches.forEach(match => {
            usedImages.add(match.replace(/^\//, '')); // Убираем начальный слеш
          });
        }
      }
    });
    
    // Проверяем все файлы в директории блога
    cleanupDirectory('public/images/blog', usedImages);
  } catch (error) {
    console.error('Ошибка при очистке файлов блога:', error);
  }
}

// Очистка фото пользователей
function cleanupUserFiles() {
  // Получаем все аватары пользователей из базы данных
  const usedAvatars = new Set<string>();
  
  try {
    const users = db.prepare('SELECT avatar FROM users WHERE avatar IS NOT NULL').all() as { avatar: string }[];
    users.forEach(user => {
      if (user.avatar) {
        usedAvatars.add(user.avatar.replace(/^\//, '')); // Убираем начальный слеш
      }
    });
    
    // Проверяем все файлы в директории пользователей
    cleanupDirectory('public/images/users', usedAvatars);
  } catch (error) {
    console.error('Ошибка при очистке файлов пользователей:', error);
  }
}

// Общая функция для очистки директории
function cleanupDirectory(dirPath: string, usedFiles: Set<string>) {
  try {
    if (!fs.existsSync(dirPath)) {
      console.log(`Директория ${dirPath} не существует, пропускаем очистку`);
      return;
    }
    
    console.log(`Начало очистки директории: ${dirPath}`);
    console.log(`Количество используемых файлов: ${usedFiles.size}`);
    
    // Получаем все файлы в директории
    const files = fs.readdirSync(dirPath);
    let removedCount = 0;
    
    // Создаем расширенный набор используемых файлов, включая WebP и миниатюры
    const extendedUsedFiles = new Set<string>(usedFiles);
    
    // Добавляем WebP версии и миниатюры в список используемых файлов
    usedFiles.forEach(file => {
      // WebP версия
      const webpVersion = file.replace(/\.(jpg|jpeg|png)$/i, '.webp');
      if (webpVersion !== file) {
        extendedUsedFiles.add(webpVersion);
      }
      
      // Миниатюра
      const thumbVersion = file.replace(/(\.[^.]+)$/, '-thumb$1');
      extendedUsedFiles.add(thumbVersion);
      
      // WebP версия миниатюры
      const thumbWebpVersion = thumbVersion.replace(/\.(jpg|jpeg|png)$/i, '.webp');
      if (thumbWebpVersion !== thumbVersion) {
        extendedUsedFiles.add(thumbWebpVersion);
      }
    });
    
    console.log(`Расширенный список используемых файлов (с WebP и миниатюрами): ${extendedUsedFiles.size}`);
    
    for (const file of files) {
      // Пропускаем директории и плейсхолдеры
      if (fs.statSync(path.join(dirPath, file)).isDirectory() || 
          file.includes('placeholder') || 
          file === '.gitkeep') {
        continue;
      }
      
      // Проверяем, используется ли файл
      const relativePath = path.join(dirPath.replace(/^public\//, ''), file);
      
      // Проверяем, является ли файл WebP версией или миниатюрой используемого файла
      const isUsed = extendedUsedFiles.has(relativePath);
      
      if (!isUsed) {
        // Удаляем неиспользуемый файл
        try {
          fs.unlinkSync(path.join(dirPath, file));
          console.log(`Удален неиспользуемый файл: ${path.join(dirPath, file)}`);
          removedCount++;
        } catch (unlinkError) {
          console.error(`Ошибка при удалении файла ${path.join(dirPath, file)}:`, unlinkError);
        }
      }
    }
    
    console.log(`Очистка директории ${dirPath} завершена, удалено файлов: ${removedCount}`);
  } catch (error) {
    console.error(`Ошибка при очистке директории ${dirPath}:`, error);
  }
} 