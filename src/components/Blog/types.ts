// Общие типы для компонентов блога

export interface Author {
  id: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  avatar?: string;
  specialization?: string;
}

export interface Article {
  id: string;
  title: string;
  excerpt: string;
  image: string;
  category: string;
  author: Author;
  publishedAt: string;
}

// Функции для работы с данными автора
export const getAuthorName = (author: Author): string => {
  if (author.firstName && author.lastName) {
    return `${author.firstName} ${author.lastName}`;
  } else if (author.name) {
    return author.name;
  }
  return 'Автор';
};

export const getAuthorInitials = (author: Author): string => {
  if (author.firstName && author.lastName) {
    return `${author.firstName.charAt(0)}${author.lastName.charAt(0)}`;
  } else if (author.name) {
    const nameParts = author.name.split(' ');
    if (nameParts.length >= 2) {
      return `${nameParts[0].charAt(0)}${nameParts[1].charAt(0)}`;
    } else if (nameParts.length === 1) {
      return nameParts[0].charAt(0);
    }
  }
  return 'A';
}; 